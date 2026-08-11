'use client';

import { Users } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { NO_SHOW_KARMA_PENALTY } from '@/core/constants/pos-check-in';
import type { TableBookingParticipant } from '../types/pos-check-in.interface';

interface AttendeeChecklistProps {
  participants: TableBookingParticipant[];
  presentIds: Set<string>;
  onToggle: (participantId: string, isPresent: boolean) => void;
  disabled?: boolean;
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
}

export function AttendeeChecklist({
  participants,
  presentIds,
  onToggle,
  disabled = false,
}: AttendeeChecklistProps) {
  const presentCount = participants.filter((p) => presentIds.has(p.id)).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-muted-foreground" />
          <h3 className="font-semibold">Danh sách thành viên</h3>
        </div>
        <Badge variant="secondary">
          {presentCount}/{participants.length} có mặt
        </Badge>
      </div>

      <p className="text-sm text-muted-foreground">
        Bỏ chọn những người vắng mặt thực tế. Hệ thống sẽ đánh dấu Absent, tịch thu cọc cá nhân và
        trừ {NO_SHOW_KARMA_PENALTY} điểm Karma.
      </p>

      <ul className="divide-y rounded-lg border">
        {participants.map((participant) => {
          const isPresent = presentIds.has(participant.id);
          const checkboxId = `attendee-${participant.id}`;

          return (
            <li
              key={participant.id}
              className="flex min-h-[52px] items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/40 md:min-h-[56px] md:px-5 md:py-4"
            >
              <Checkbox
                id={checkboxId}
                checked={isPresent}
                disabled={disabled || participant.attendanceStatus === 'Absent'}
                onCheckedChange={(checked) => onToggle(participant.id, checked === true)}
                className="size-5 md:size-[22px]"
              />
              <Label
                htmlFor={checkboxId}
                className="flex flex-1 cursor-pointer items-center justify-between gap-3 text-base"
              >
                <span className="font-medium">{participant.displayName}</span>
                <span className="flex shrink-0 items-center gap-2 text-xs text-muted-foreground md:text-sm">
                  Cọc: {formatCurrency(participant.depositAmount)}
                  {participant.attendanceStatus === 'Absent' && (
                    <Badge variant="destructive" className="text-[10px]">
                      Absent
                    </Badge>
                  )}
                </span>
              </Label>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
