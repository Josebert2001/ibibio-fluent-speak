import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { 
  Mic, 
  MicOff, 
  Volume2, 
  VolumeX, 
  Settings, 
  Play, 
  Square,
  RotateCcw,
  MessageSquare
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface VoiceSettings {
  rate: number;
  pitch: number;
  volume: number;
  voiceIndex: number;
}

interface VoiceControlPanelProps {
  isListening: boolean;
  onStartListening: () => void;
  onStopListening: () => void;
  onVoiceSettings: (settings: Partial<VoiceSettings>) => void;
  currentSettings: VoiceSettings;
  supportedCommands?: string[];
  lastTranscript?: string;
  className?: string;
}

const VoiceControlPanel: React.FC<VoiceControlPanelProps> = ({
  isListening,
  onStartListening,
  onStopListening,
  onVoiceSettings,
  currentSettings,
  supportedCommands = [],
  lastTranscript,
  className
}) => {
  const [showSettings, setShowSettings] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);

  // Simulate audio level visualization
  useEffect(() => {
    if (isListening) {
      const interval = setInterval(() => {
        setAudioLevel(Math.random() * 100);
      }, 100);
      return () => clearInterval(interval);
    } else {
      setAudioLevel(0);
    }
  }, [isListening]);

  const handleRateChange = (value: number[]) => {
    onVoiceSettings({ rate: value[0] });
  };

  const handlePitchChange = (value: number[]) => {
    onVoiceSettings({ pitch: value[0] });
  };

  const handleVolumeChange = (value: number[]) => {
    onVoiceSettings({ volume: value[0] });
  };

  const resetSettings = () => {
    onVoiceSettings({
      rate: 0.8,
      pitch: 1.0,
      volume: 1.0,
      voiceIndex: 0
    });
  };

  return (
    <Card className={cn("p-4", className)}>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Volume2 className="w-5 h-5" />
            Voice Controls
          </h3>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowSettings(!showSettings)}
          >
            <Settings className="w-4 h-4" />
          </Button>
        </div>

        {/* Main Controls */}
        <div className="flex items-center justify-center gap-4">
          <Button
            variant={isListening ? "destructive" : "default"}
            size="lg"
            onClick={isListening ? onStopListening : onStartListening}
            className="flex items-center gap-2"
          >
            {isListening ? (
              <>
                <MicOff className="w-5 h-5" />
                Stop Listening
              </>
            ) : (
              <>
                <Mic className="w-5 h-5" />
                Start Listening
              </>
            )}
          </Button>
        </div>

        {/* Audio Level Visualization */}
        {isListening && (
          <div className="space-y-2">
            <div className="text-sm text-muted-foreground text-center">
              Listening...
            </div>
            <div className="flex items-center justify-center gap-1">
              {Array.from({ length: 10 }).map((_, i) => (
                <div
                  key={i}
                  className={cn(
                    "w-2 h-6 bg-muted rounded transition-all duration-100",
                    audioLevel > i * 10 && "bg-primary"
                  )}
                />
              ))}
            </div>
          </div>
        )}

        {/* Last Transcript */}
        {lastTranscript && (
          <div className="p-3 bg-muted rounded-lg">
            <div className="text-sm text-muted-foreground mb-1">
              Last heard:
            </div>
            <div className="text-sm font-medium">
              "{lastTranscript}"
            </div>
          </div>
        )}

        {/* Voice Settings */}
        {showSettings && (
          <div className="space-y-4 pt-4 border-t">
            <h4 className="font-medium">Voice Settings</h4>
            
            {/* Speed Control */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm text-muted-foreground">
                  Speech Rate
                </label>
                <span className="text-sm font-medium">
                  {currentSettings.rate.toFixed(1)}x
                </span>
              </div>
              <Slider
                value={[currentSettings.rate]}
                onValueChange={handleRateChange}
                min={0.1}
                max={2.0}
                step={0.1}
                className="w-full"
              />
            </div>

            {/* Pitch Control */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm text-muted-foreground">
                  Pitch
                </label>
                <span className="text-sm font-medium">
                  {currentSettings.pitch.toFixed(1)}
                </span>
              </div>
              <Slider
                value={[currentSettings.pitch]}
                onValueChange={handlePitchChange}
                min={0.1}
                max={2.0}
                step={0.1}
                className="w-full"
              />
            </div>

            {/* Volume Control */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm text-muted-foreground">
                  Volume
                </label>
                <span className="text-sm font-medium">
                  {Math.round(currentSettings.volume * 100)}%
                </span>
              </div>
              <Slider
                value={[currentSettings.volume]}
                onValueChange={handleVolumeChange}
                min={0}
                max={1}
                step={0.1}
                className="w-full"
              />
            </div>

            {/* Reset Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={resetSettings}
              className="w-full"
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              Reset to Default
            </Button>
          </div>
        )}

        {/* Voice Commands Help */}
        {supportedCommands.length > 0 && (
          <div className="space-y-2 pt-4 border-t">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <MessageSquare className="w-4 h-4" />
              Voice Commands:
            </div>
            <div className="flex flex-wrap gap-1">
              {supportedCommands.slice(0, 4).map((command, index) => (
                <Badge key={index} variant="outline" className="text-xs">
                  "{command}"
                </Badge>
              ))}
              {supportedCommands.length > 4 && (
                <Badge variant="outline" className="text-xs">
                  +{supportedCommands.length - 4} more
                </Badge>
              )}
            </div>
          </div>
        )}

        {/* Status Indicator */}
        <div className="flex items-center justify-center">
          <Badge 
            variant={isListening ? "default" : "secondary"}
            className={cn(
              "flex items-center gap-1",
              isListening && "bg-green-100 text-green-800"
            )}
          >
            {isListening ? (
              <>
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                Active
              </>
            ) : (
              <>
                <div className="w-2 h-2 bg-muted-foreground rounded-full" />
                Inactive
              </>
            )}
          </Badge>
        </div>
      </div>
    </Card>
  );
};

export default VoiceControlPanel;