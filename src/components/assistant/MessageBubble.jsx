import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { Zap, CheckCircle2, AlertCircle, Loader2, ChevronRight, Clock } from 'lucide-react';
import { cn } from "@/lib/utils";

const FunctionDisplay = ({ toolCall }) => {
    const [expanded, setExpanded] = useState(false);
    const name = toolCall?.name || 'Function';
    const status = toolCall?.status || 'pending';
    const results = toolCall?.results;
    
    const parsedResults = (() => {
        if (!results) return null;
        try {
            return typeof results === 'string' ? JSON.parse(results) : results;
        } catch {
            return results;
        }
    })();
    
    const isError = results && (
        (typeof results === 'string' && /error|failed/i.test(results)) ||
        (parsedResults?.success === false)
    );
    
    const statusConfig = {
        pending: { icon: Clock, color: 'text-muted-foreground', text: 'Pending' },
        running: { icon: Loader2, color: 'text-muted-foreground', text: 'Running...', spin: true },
        in_progress: { icon: Loader2, color: 'text-muted-foreground', text: 'Running...', spin: true },
        completed: isError ? 
            { icon: AlertCircle, color: 'text-[hsl(354_42%_74%)]', text: 'Failed' } : 
            { icon: CheckCircle2, color: 'text-[hsl(151_31%_73%)]', text: 'Success' },
        success: { icon: CheckCircle2, color: 'text-[hsl(151_31%_73%)]', text: 'Success' },
        failed: { icon: AlertCircle, color: 'text-[hsl(354_42%_74%)]', text: 'Failed' },
        error: { icon: AlertCircle, color: 'text-[hsl(354_42%_74%)]', text: 'Failed' }
    }[status] || { icon: Zap, color: 'text-muted-foreground', text: '' };
    
    const Icon = statusConfig.icon;
    const formattedName = name.split('.').reverse().join(' ').toLowerCase();
    
    return (
        <div className="mt-2 text-xs">
            <button
                onClick={() => setExpanded(!expanded)}
                className={cn(
                    "flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all",
                    "hover:bg-muted",
                    expanded ? "bg-muted border-border" : "bg-card border-border"
                )}
            >
                <Icon className={cn("h-3 w-3", statusConfig.color, statusConfig.spin && "animate-spin")} />
                <span className="text-foreground">{formattedName}</span>
                {statusConfig.text && (
                    <span className={cn("text-muted-foreground", isError && "text-[hsl(354_42%_74%)]")}>
                        • {statusConfig.text}
                    </span>
                )}
                {!statusConfig.spin && (toolCall.arguments_string || results) && (
                    <ChevronRight className={cn("h-3 w-3 text-muted-foreground transition-transform ml-auto", 
                        expanded && "rotate-90")} />
                )}
            </button>
            
            {expanded && !statusConfig.spin && (
                <div className="mt-1.5 ml-3 pl-3 border-l-2 border-border space-y-2">
                    {toolCall.arguments_string && (
                        <div>
                            <div className="text-xs text-muted-foreground mb-1">Parameters:</div>
                            <pre className="bg-muted rounded-md p-2 text-xs text-muted-foreground whitespace-pre-wrap">
                                {(() => {
                                    try {
                                        return JSON.stringify(JSON.parse(toolCall.arguments_string), null, 2);
                                    } catch {
                                        return toolCall.arguments_string;
                                    }
                                })()}
                            </pre>
                        </div>
                    )}
                    {parsedResults && (
                        <div>
                            <div className="text-xs text-muted-foreground mb-1">Result:</div>
                            <pre className="bg-muted rounded-md p-2 text-xs text-muted-foreground whitespace-pre-wrap max-h-48 overflow-auto">
                                {typeof parsedResults === 'object' ? 
                                    JSON.stringify(parsedResults, null, 2) : parsedResults}
                            </pre>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default function MessageBubble({ message }) {
    const isUser = message.role === 'user';
    
    return (
        <div className={cn("flex gap-3", isUser ? "justify-end" : "justify-start")}>
            {!isUser && (
                <div className="h-7 w-7 rounded-lg bg-[hsl(253_23%_22%)] flex items-center justify-center mt-0.5">
                    <div className="h-3 w-3 rounded-full bg-[hsl(253_23%_36%)]" />
                </div>
            )}
            <div className={cn("max-w-[85%]", isUser && "flex flex-col items-end")}>
                {message.content && (
                    <div className={cn(
                        "rounded-2xl px-4 py-2.5",
                        isUser ? "bg-[hsl(253_23%_36%)] text-white" : "bg-card border border-border"
                    )}>
                        {isUser ? (
                            <p className="text-sm leading-relaxed">{message.content}</p>
                        ) : (
                            <ReactMarkdown 
                                className="text-sm prose prose-sm prose-slate max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0"
                            >
                                {message.content}
                            </ReactMarkdown>
                        )}
                    </div>
                )}
                
                {message.tool_calls?.length > 0 && (
                    <div className="space-y-1">
                        {message.tool_calls.map((toolCall, idx) => (
                            <FunctionDisplay key={idx} toolCall={toolCall} />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}