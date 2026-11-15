import { useState, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Mic, Square, Loader2 } from "lucide-react";

export default function AudioRecorder({ onAudioRecorded, disabled }) {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' });
        const audioFile = new File([audioBlob], `audio-${Date.now()}.webm`, { type: 'audio/webm' });
        
        stream.getTracks().forEach(track => track.stop());
        
        if (onAudioRecorded) {
          setIsProcessing(true);
          await onAudioRecorded(audioFile);
          setIsProcessing(false);
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (error) {
      console.error("Error accessing microphone:", error);
      alert("Could not access the microphone. Please check your permissions.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  if (isProcessing) {
    return (
      <Button disabled className="bg-[hsl(253_23%_36%)]">
        <Loader2 className="w-4 h-4 animate-spin" />
      </Button>
    );
  }

  if (isRecording) {
    return (
      <Button 
        onClick={stopRecording}
        className="bg-[hsl(354_22%_36%)] hover:bg-[hsl(354_22%_36%)] animate-pulse"
      >
        <Square className="w-4 h-4" />
      </Button>
    );
  }

  return (
    <Button
      onClick={startRecording}
      disabled={disabled}
      variant="outline"
      className="hover:bg-accent"
    >
      <Mic className="w-4 h-4" />
    </Button>
  );
}