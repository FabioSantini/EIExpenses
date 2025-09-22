"use client";

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

type ReportStatus = 'draft' | 'submitted' | 'approved' | 'rejected';

interface StatusChangeDialogProps {
  isOpen: boolean;
  onClose: () => void;
  currentStatus: ReportStatus;
  reportTitle: string;
  onConfirm: (newStatus: ReportStatus) => Promise<void>;
}

const statusOptions: { value: ReportStatus; label: string; description: string }[] = [
  { value: 'draft', label: 'Draft', description: 'Report is being prepared' },
  { value: 'submitted', label: 'Submitted', description: 'Report submitted for review' },
  { value: 'approved', label: 'Approved', description: 'Report has been approved' },
  { value: 'rejected', label: 'Rejected', description: 'Report needs revision' }
];

export function StatusChangeDialog({
  isOpen,
  onClose,
  currentStatus,
  reportTitle,
  onConfirm
}: StatusChangeDialogProps) {
  const [selectedStatus, setSelectedStatus] = useState<ReportStatus>(currentStatus);
  const [isUpdating, setIsUpdating] = useState(false);

  const handleConfirm = async () => {
    if (selectedStatus === currentStatus) {
      onClose();
      return;
    }

    try {
      setIsUpdating(true);
      await onConfirm(selectedStatus);
      onClose();
    } catch (error) {
      console.error('Error updating status:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleCancel = () => {
    setSelectedStatus(currentStatus);
    onClose();
  };

  const currentStatusLabel = statusOptions.find(option => option.value === currentStatus)?.label || currentStatus;
  const selectedStatusLabel = statusOptions.find(option => option.value === selectedStatus)?.label || selectedStatus;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Change Report Status</DialogTitle>
          <DialogDescription>
            Update the status for "{reportTitle}"
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="current-status">Current Status</Label>
            <div className="text-sm text-muted-foreground">
              {currentStatusLabel}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="new-status">New Status</Label>
            <Select value={selectedStatus} onValueChange={(value: ReportStatus) => setSelectedStatus(value)}>
              <SelectTrigger>
                <SelectValue placeholder="Select new status" />
              </SelectTrigger>
              <SelectContent>
                {statusOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    <div className="flex flex-col">
                      <span className="font-medium">{option.label}</span>
                      <span className="text-xs text-muted-foreground">{option.description}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedStatus !== currentStatus && (
            <div className="text-sm text-muted-foreground bg-muted p-3 rounded-md">
              Status will change from <strong>{currentStatusLabel}</strong> to <strong>{selectedStatusLabel}</strong>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={handleCancel}
            disabled={isUpdating}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleConfirm}
            disabled={isUpdating || selectedStatus === currentStatus}
          >
            {isUpdating ? 'Updating...' : 'Confirm'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}