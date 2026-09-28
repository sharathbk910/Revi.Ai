import React from 'react';
import { NexAssistantModal as AgentModalComponent } from './AgentModal';
import { ErrorBoundary } from '../common/ErrorBoundary';

interface NexAssistantModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const NexAssistantModal: React.FC<NexAssistantModalProps> = (props) => {
  if (!props.isOpen) return null;

  return (
    <ErrorBoundary fallbackTitle="Revisionly AI Assistant Encountered an Issue" onReset={props.onClose}>
      <AgentModalComponent {...props} />
    </ErrorBoundary>
  );
};
