import { Toggle, NumberInput, FormGroup } from '@carbon/react';

interface SchedulerProps {
  enabled: boolean;
  interval: number;
  onToggle: (enabled: boolean) => void;
  onIntervalChange: (interval: number) => void;
  lastRun?: string;
  nextRun?: string;
}

export function WebhookScheduler({ 
  enabled, 
  interval, 
  onToggle, 
  onIntervalChange,
  lastRun,
  nextRun 
}: SchedulerProps) {
  return (
    <FormGroup legendText="Scheduler Settings">
      <Toggle
        id="scheduler-toggle"
        labelText="Enable Automatic Execution"
        toggled={enabled}
        onToggle={(enabled) => onToggle(enabled)}
      />
      
      {enabled && (
        <>
          <NumberInput
            id="scheduler-interval"
            label="Execution Interval (minutes)"
            min={5}
            max={1440}
            value={interval}
            onChange={(e, { value }) => onIntervalChange(parseInt(String(value)))}
            helperText="Minimum 5 minutes, maximum 24 hours"
          />
          
          {lastRun && (
            <p className="scheduler-info">Last Run: {new Date(lastRun).toLocaleString()}</p>
          )}
          
          {nextRun && (
            <p className="scheduler-info">Next Run: {new Date(nextRun).toLocaleString()}</p>
          )}
        </>
      )}
    </FormGroup>
  );
} 