import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { supabase } from '../lib/supabase';

interface BlockReportModalProps {
  visible: boolean;
  onClose: () => void;
  myProfileId: string | null;
  targetProfileId: string | null;
  targetName?: string;
  onSuccessBlockOrReport?: () => void;
}

const REPORT_REASONS = [
  'Inappropriate behavior',
  'Fake profile / Fraud',
  'Harassment or offensive language',
  'Spam or advertising',
  'Other',
];

export function BlockReportModal({
  visible,
  onClose,
  myProfileId,
  targetProfileId,
  targetName = 'Candidate',
  onSuccessBlockOrReport,
}: BlockReportModalProps) {
  const [selectedReason, setSelectedReason] = useState(REPORT_REASONS[0]);
  const [details, setDetails] = useState('');
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<'options' | 'report'>('options');

  const handleBlockOnly = async () => {
    if (!myProfileId || !targetProfileId) {
      Alert.alert('Error', 'Unable to perform action. Profile missing.');
      return;
    }

    Alert.alert(
      `Block ${targetName}?`,
      'They will no longer be able to message you or view your profile.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Block Candidate',
          style: 'destructive',
          onPress: async () => {
            setLoading(true);
            try {
              const { error } = await supabase.from('user_blocks').upsert(
                { blocker_profile_id: myProfileId, blocked_profile_id: targetProfileId },
                { onConflict: 'blocker_profile_id,blocked_profile_id' }
              );

              if (error) throw error;
              Alert.alert('Blocked', `${targetName} has been blocked.`);
              onClose();
              onSuccessBlockOrReport?.();
            } catch (err: any) {
              Alert.alert('Error', err.message || 'Failed to block candidate.');
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleSubmitReport = async () => {
    if (!myProfileId || !targetProfileId) {
      Alert.alert('Error', 'Unable to perform action. Profile missing.');
      return;
    }

    setLoading(true);
    try {
      // 1. Insert report entry into user_reports
      const { error: reportError } = await supabase.from('user_reports').insert({
        reporter_profile_id: myProfileId,
        reported_profile_id: targetProfileId,
        reason: selectedReason,
        details: details.trim() || null,
        status: 'pending',
      });

      if (reportError) throw reportError;

      // 2. Auto-block reported profile for safety
      await supabase.from('user_blocks').upsert(
        { blocker_profile_id: myProfileId, blocked_profile_id: targetProfileId },
        { onConflict: 'blocker_profile_id,blocked_profile_id' }
      );

      Alert.alert('Report Submitted', 'Thank you for reporting. Candidate has been reported and blocked for your safety.');
      setMode('options');
      setDetails('');
      onClose();
      onSuccessBlockOrReport?.();
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to submit report.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.container}>
          <Text style={styles.title}>Safety & Moderation</Text>
          <Text style={styles.subtitle}>Action for {targetName}</Text>

          {mode === 'options' ? (
            <View style={styles.optionsWrapper}>
              <TouchableOpacity
                style={[styles.actionBtn, styles.blockBtn]}
                onPress={handleBlockOnly}
                disabled={loading}
              >
                <Text style={styles.blockBtnText}>🚫 Block Candidate</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionBtn, styles.reportBtn]}
                onPress={() => setMode('report')}
                disabled={loading}
              >
                <Text style={styles.reportBtnText}>🚩 Report Candidate</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.cancelBtn} onPress={onClose} disabled={loading}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.reportWrapper}>
              <Text style={styles.label}>Select Reason:</Text>
              {REPORT_REASONS.map((reason) => (
                <TouchableOpacity
                  key={reason}
                  style={[styles.radioItem, selectedReason === reason && styles.radioItemSelected]}
                  onPress={() => setSelectedReason(reason)}
                >
                  <Text
                    style={[styles.radioText, selectedReason === reason && styles.radioTextSelected]}
                  >
                    {selectedReason === reason ? '🔘 ' : '⚪ '} {reason}
                  </Text>
                </TouchableOpacity>
              ))}

              <Text style={styles.label}>Additional Details (Optional):</Text>
              <TextInput
                style={styles.detailsInput}
                placeholder="Describe the issue..."
                placeholderTextColor="#94a3b8"
                multiline
                numberOfLines={3}
                value={details}
                onChangeText={setDetails}
              />

              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={[styles.modalBtn, styles.modalBtnSecondary]}
                  onPress={() => setMode('options')}
                  disabled={loading}
                >
                  <Text style={styles.secondaryBtnText}>Back</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.modalBtn, styles.modalBtnDanger]}
                  onPress={handleSubmitReport}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator color="#ffffff" size="small" />
                  ) : (
                    <Text style={styles.dangerBtnText}>Submit & Block</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 20,
  },
  container: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 20,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0f172a',
  },
  subtitle: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 2,
    marginBottom: 16,
  },
  optionsWrapper: {
    gap: 12,
  },
  actionBtn: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  blockBtn: {
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fca5a5',
  },
  blockBtnText: {
    color: '#dc2626',
    fontWeight: '600',
    fontSize: 15,
  },
  reportBtn: {
    backgroundColor: '#fff1f2',
    borderWidth: 1,
    borderColor: '#f43f5e',
  },
  reportBtnText: {
    color: '#be123c',
    fontWeight: '600',
    fontSize: 15,
  },
  cancelBtn: {
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 4,
  },
  cancelBtnText: {
    color: '#64748b',
    fontSize: 14,
    fontWeight: '500',
  },
  reportWrapper: {
    gap: 10,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#334155',
    marginTop: 4,
  },
  radioItem: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  radioItemSelected: {
    backgroundColor: '#fff1f2',
    borderColor: '#f43f5e',
  },
  radioText: {
    fontSize: 14,
    color: '#475569',
  },
  radioTextSelected: {
    color: '#be123c',
    fontWeight: '600',
  },
  detailsInput: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 10,
    padding: 10,
    fontSize: 14,
    color: '#0f172a',
    textAlignVertical: 'top',
    height: 70,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
  },
  modalBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  modalBtnSecondary: {
    backgroundColor: '#f1f5f9',
  },
  secondaryBtnText: {
    color: '#475569',
    fontWeight: '600',
  },
  modalBtnDanger: {
    backgroundColor: '#e11d48',
  },
  dangerBtnText: {
    color: '#ffffff',
    fontWeight: '600',
  },
});
