// Group listening policy engine. Pure: it reads a context object and returns a decision that is
// stored on the message row, so every silence can be explained from the database.
//
// Default posture is silent listening. Gates run in the spec's strict order; the first failure
// stops the reply. A failed gate still stores the message unless the chat is disabled.

export const LISTEN_MODES = ['silent', 'admin_only', 'mention_only', 'command_only', 'smart', 'disabled'];

const digits = (value) => String(value ?? '').replace(/\D/g, '');
const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export function mentionsAgent(message, agent) {
  if (message.reply_to_is_agent) return true;
  const text = String(message.text ?? '');
  const phone = digits(agent.phone);
  if (phone && (message.mentions ?? []).some((id) => digits(id) === phone)) return true;
  if (phone && text.includes(`@${phone}`)) return true;
  return (agent.names ?? []).filter(Boolean).some((name) =>
    new RegExp(`(^|[^\\p{L}\\p{N}])@?${escapeRegex(name)}($|[^\\p{L}\\p{N}])`, 'iu').test(text));
}

export function startsWithCommand(text, prefix) {
  const value = String(text ?? '').trimStart().toLowerCase();
  const command = String(prefix ?? '').toLowerCase();
  return Boolean(command) && value.startsWith(command) && (value.length === command.length || /\s/.test(value[command.length]));
}

// Cheap, deterministic "does a reply add value" score for smart mode. No model call.
export function smartScore(message, agent) {
  const text = String(message.text ?? '').trim();
  if (!text) return 0;
  let score = 0;
  if (mentionsAgent(message, agent)) score += 0.6;
  if (text.includes('?')) score += 0.4;
  if (/^(who|what|when|where|why|how|can|could|is|are|do|does|did|will|should|please)\b/i.test(text)) score += 0.3;
  if (/\b(help|issue|problem|urgent|price|cost|status|update|deadline|schedule)\b/i.test(text)) score += 0.2;
  if (text.length < 4) score -= 0.3;
  return Math.max(0, Math.min(1, Number(score.toFixed(2))));
}

// Section 6.3: the manual registry is the source of truth; a provider hint only fills gaps.
export function resolveSender({ phone, tenant, contact, membership, providerSaysAdmin }) {
  const number = digits(phone);
  if (number && number === digits(tenant?.owner_phone)) return { role: 'owner', admin_verified: true, source: 'owner_number' };
  if (contact?.role === 'owner') return { role: 'owner', admin_verified: true, source: 'registry' };
  if (membership?.role === 'admin' && membership.admin_source !== 'provider') {
    return { role: 'admin', admin_verified: true, source: membership.admin_source || 'registry' };
  }
  if (contact?.is_group_admin || contact?.role === 'admin') return { role: 'admin', admin_verified: true, source: 'registry' };
  if (membership?.role === 'member' && membership.admin_source === 'registry') {
    return { role: 'member', admin_verified: false, source: 'registry' };
  }
  if (providerSaysAdmin || membership?.role === 'admin') return { role: 'admin', admin_verified: true, source: 'provider' };
  return { role: contact ? 'member' : 'unknown', admin_verified: false, source: 'none' };
}

/**
 * @param ctx {
 *   channel: { status }, tenant: { status, default_group_allowed },
 *   usage: { messages, message_cap, cost_usd, cost_cap_usd },
 *   conversation: { chat_type, listen_mode, command_prefix, allowlisted, cooldown_seconds, hourly_cap,
 *                   smart_threshold, memory_enabled, mute_until },
 *   allowlist_in_use: boolean,            // tenant has at least one allowlisted group
 *   message: { text, mentions, reply_to_is_agent, is_from_agent },
 *   sender: { role, admin_verified, blocked, memory_enabled },
 *   agent: { phone, names },
 *   state: { last_reply_to_sender_at, replies_this_hour, last_reply_in_chat_at, outbound_limited },
 *   now: Date }
 */
export function evaluate(ctx) {
  const { conversation, message, sender, state = {}, usage = {} } = ctx;
  const now = ctx.now ?? new Date();
  const isGroup = conversation.chat_type === 'group';
  const mode = conversation.listen_mode;
  const gates = [];
  const decide = (reply, reason, detail) => {
    const store = mode !== 'disabled' && reason !== 'self_message';
    return {
      reply,
      store,
      // Stored turns feed memory only when the chat and the person both allow it.
      remember: store && conversation.memory_enabled !== false && sender.memory_enabled !== false,
      mode,
      reason: reply ? null : reason,
      detail: detail ?? null,
      gates,
      evaluated_at: now.toISOString(),
    };
  };
  const gate = (name, pass, reason, detail) => {
    gates.push({ gate: name, pass });
    return pass ? null : decide(false, reason, detail);
  };
  const secondsSince = (at) => (at ? (now.getTime() - new Date(at).getTime()) / 1000 : Infinity);
  let failed;

  if ((failed = gate('channel_enabled', ctx.channel.status === 'active', 'channel_disabled'))) return failed;

  const overMessages = usage.message_cap > 0 && usage.messages >= usage.message_cap;
  const overCost = usage.cost_cap_usd > 0 && usage.cost_usd >= usage.cost_cap_usd;
  if ((failed = gate('tenant_active', ctx.tenant.status === 'active', 'tenant_inactive'))) return failed;
  if ((failed = gate('plan_limits', !overMessages && !overCost, overCost ? 'cost_cap_reached' : 'message_cap_reached'))) return failed;

  const allowed = !isGroup || conversation.allowlisted || (!ctx.allowlist_in_use && ctx.tenant.default_group_allowed !== false);
  if ((failed = gate('group_allowed', allowed, 'group_not_allowlisted'))) return failed;
  if ((failed = gate('mode_enabled', mode !== 'disabled', 'mode_disabled'))) return failed;
  if ((failed = gate('not_self', !message.is_from_agent, 'self_message'))) return failed;
  if ((failed = gate('not_blocked', !sender.blocked, 'sender_blocked'))) return failed;

  const muted = conversation.mute_until && new Date(conversation.mute_until) > now;
  if ((failed = gate('not_muted', !muted, 'muted', { until: conversation.mute_until }))) return failed;

  let pass;
  let reason;
  let detail;
  switch (mode) {
    case 'silent':
      pass = false; reason = 'mode_silent'; break;
    case 'admin_only':
      pass = ['owner', 'admin'].includes(sender.role) && sender.admin_verified === true;
      reason = 'sender_not_verified_admin'; break;
    case 'mention_only':
      pass = mentionsAgent(message, ctx.agent); reason = 'not_mentioned'; break;
    case 'command_only':
      pass = startsWithCommand(message.text, conversation.command_prefix); reason = 'no_command_prefix'; break;
    case 'smart': {
      const score = smartScore(message, ctx.agent);
      const threshold = Number(conversation.smart_threshold ?? 0.6);
      detail = { score, threshold };
      pass = score >= threshold; reason = 'smart_score_below_threshold';
      break;
    }
    default:
      pass = false; reason = 'unknown_mode';
  }
  if ((failed = gate('mode_gate', pass, reason, detail))) return failed;

  const cooldown = Number(conversation.cooldown_seconds ?? 20);
  const wait = cooldown - secondsSince(state.last_reply_to_sender_at);
  if ((failed = gate('sender_cooldown', wait <= 0, 'sender_cooldown', { retry_after: Math.ceil(wait) }))) return failed;
  const cap = Number(conversation.hourly_cap ?? 30);
  if (isGroup && (failed = gate('hourly_cap', (state.replies_this_hour ?? 0) < cap, 'hourly_cap_reached', { cap }))) return failed;
  if ((failed = gate('outbound_rate', !state.outbound_limited, 'outbound_rate_limited'))) return failed;

  return decide(true, null, detail);
}
