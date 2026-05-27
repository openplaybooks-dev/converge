import type { FeedbackEntry } from '../types';

interface Props {
  message: FeedbackEntry;
}

export function AssistantMessage({ message }: Props) {
  return (
    <div className="assistant-message">
      <div className="assistant-message__header">
        <span className="assistant-message__role">
          {message.role === 'assistant' ? 'Planner' : 'You'}
        </span>
        <span className="assistant-message__time">
          {new Date(message.timestamp).toLocaleTimeString()}
        </span>
      </div>
      <div className="assistant-message__body">{message.message}</div>
    </div>
  );
}
