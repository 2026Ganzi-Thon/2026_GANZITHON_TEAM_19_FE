import { useState } from 'react';

import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { TextField } from '@/components/ui/TextField';
import { ADMIN } from '@/copy/admin';
import { COMMON } from '@/copy/fixed';

const REASON_MAX = 500;

interface ReasonModalProps {
  open: boolean;
  title: string;
  body?: string;
  confirmLabel: string;
  loading: boolean;
  onConfirm: (reason: string) => void;
  onClose: () => void;
}

/** 사유를 받아야 하는 어드민 조치의 확인 창. 사유가 비어 있으면 진행할 수 없다 */
export function ReasonModal({
  open,
  title,
  body,
  confirmLabel,
  loading,
  onConfirm,
  onClose,
}: ReasonModalProps) {
  const [reason, setReason] = useState('');
  const trimmed = reason.trim();

  return (
    <Modal
      open={open}
      title={title}
      onClose={onClose}
      footer={
        <>
          <Button block size="md" variant="secondary" onClick={onClose}>
            {COMMON.cancel}
          </Button>
          <Button
            block
            size="md"
            disabled={trimmed.length === 0}
            loading={loading}
            onClick={() => onConfirm(trimmed)}
          >
            {confirmLabel}
          </Button>
        </>
      }
    >
      {body && <p className="pb-4 text-body-sm text-fg-muted">{body}</p>}
      <TextField
        label={ADMIN.reason}
        hint={ADMIN.reasonRequired}
        maxLength={REASON_MAX}
        value={reason}
        onChange={(event) => setReason(event.target.value)}
      />
    </Modal>
  );
}
