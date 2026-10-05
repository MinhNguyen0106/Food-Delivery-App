import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { colors } from '@/theme';

interface DatePickerFieldProps {
  value: string;
  onChange: (value: string) => void;
  label?: string;
}

const WEEKDAYS = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];

function dateValue(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function parseDate(value: string): Date | null {
  const normalized = value.slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized)) return null;
  const [year, month, day] = normalized.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year
    && date.getMonth() === month - 1
    && date.getDate() === day
    ? date
    : null;
}

function formatDate(value: string): string {
  const date = parseDate(value);
  return date
    ? new Intl.DateTimeFormat('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      }).format(date)
    : 'Chọn ngày sinh';
}

function getCalendarDays(year: number, month: number): (Date | null)[] {
  const firstDayOffset = (new Date(year, month, 1).getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  return [
    ...Array.from<Date | null>({ length: firstDayOffset }).fill(null),
    ...Array.from({ length: daysInMonth }, (_, index) => new Date(year, month, index + 1)),
    ...Array.from<Date | null>({
      length: 42 - firstDayOffset - daysInMonth,
    }).fill(null),
  ];
}

export function DatePickerField({ value, onChange, label = 'Ngày sinh' }: DatePickerFieldProps) {
  const selectedDate = parseDate(value);
  const [isOpen, setIsOpen] = useState(false);
  const [showYears, setShowYears] = useState(false);
  const [visibleMonth, setVisibleMonth] = useState(() => selectedDate ?? new Date());
  const today = new Date();
  const currentDate = dateValue(today);
  const currentMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const calendarYear = visibleMonth.getFullYear();
  const calendarMonth = visibleMonth.getMonth();
  const monthLabel = new Intl.DateTimeFormat('vi-VN', {
    month: 'long',
    year: 'numeric',
  }).format(visibleMonth);
  const years = Array.from(
    { length: today.getFullYear() - 1899 },
    (_, index) => today.getFullYear() - index,
  );

  function openPicker() {
    setVisibleMonth(selectedDate ?? new Date());
    setShowYears(false);
    setIsOpen(true);
  }

  function shiftMonth(offset: number) {
    setVisibleMonth(new Date(calendarYear, calendarMonth + offset, 1));
  }

  function selectDay(date: Date) {
    onChange(dateValue(date));
    setIsOpen(false);
  }

  return (
    <>
      <View style={styles.field}>
        <Text style={styles.label}>{label}</Text>
        <Pressable
          onPress={openPicker}
          accessibilityRole="button"
          accessibilityLabel={`Ngày sinh: ${formatDate(value)}`}
          style={({ pressed }) => [styles.input, pressed && styles.pressed]}
        >
          <Text style={[styles.value, !selectedDate && styles.placeholder]}>
            {formatDate(value)}
          </Text>
          <Text style={styles.calendarIcon} accessibilityElementsHidden>▦</Text>
        </Pressable>
      </View>

      <Modal
        animationType="fade"
        transparent
        visible={isOpen}
        onRequestClose={() => setIsOpen(false)}
      >
        <View style={styles.overlay}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => setIsOpen(false)}
            accessibilityLabel="Đóng bộ chọn ngày sinh"
          />
          <View style={styles.dialog} accessibilityViewIsModal>
            <View style={styles.dialogHeader}>
              <View>
                <Text style={styles.eyebrow}>THÔNG TIN CÁ NHÂN</Text>
                <Text style={styles.title}>Chọn ngày sinh</Text>
              </View>
              <Pressable
                onPress={() => setIsOpen(false)}
                accessibilityRole="button"
                accessibilityLabel="Đóng"
                hitSlop={10}
              >
                <Text style={styles.close}>×</Text>
              </Pressable>
            </View>

            {showYears ? (
              <ScrollView style={styles.yearList} contentContainerStyle={styles.yearGrid}>
                {years.map((year) => (
                  <Pressable
                    key={year}
                    onPress={() => {
                      setVisibleMonth(new Date(year, calendarMonth, 1));
                      setShowYears(false);
                    }}
                    style={[
                      styles.yearOption,
                      year === calendarYear && styles.yearOptionSelected,
                    ]}
                    accessibilityRole="button"
                    accessibilityState={{ selected: year === calendarYear }}
                  >
                    <Text
                      style={[
                        styles.yearLabel,
                        year === calendarYear && styles.yearLabelSelected,
                      ]}
                    >
                      {year}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>
            ) : (
              <>
                <View style={styles.monthHeader}>
                  <Pressable
                    onPress={() => shiftMonth(-1)}
                    disabled={calendarYear === 1900 && calendarMonth === 0}
                    accessibilityRole="button"
                    accessibilityLabel="Tháng trước"
                    style={styles.monthArrow}
                  >
                    <Text style={styles.arrowLabel}>‹</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => setShowYears(true)}
                    accessibilityRole="button"
                    accessibilityLabel="Chọn năm"
                    style={styles.monthTitleButton}
                  >
                    <Text style={styles.monthTitle}>
                      {monthLabel.charAt(0).toLocaleUpperCase('vi-VN') + monthLabel.slice(1)}
                    </Text>
                    <Text style={styles.yearChevron}>⌄</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => shiftMonth(1)}
                    disabled={
                      calendarYear > currentMonth.getFullYear()
                      || (calendarYear === currentMonth.getFullYear()
                        && calendarMonth >= currentMonth.getMonth())
                    }
                    accessibilityRole="button"
                    accessibilityLabel="Tháng sau"
                    style={styles.monthArrow}
                  >
                    <Text style={styles.arrowLabel}>›</Text>
                  </Pressable>
                </View>

                <View style={styles.calendarGrid}>
                  {WEEKDAYS.map((weekday) => (
                    <Text key={weekday} style={styles.weekday}>{weekday}</Text>
                  ))}
                  {getCalendarDays(calendarYear, calendarMonth).map((date, index) => {
                    const key = date ? dateValue(date) : `empty-${index}`;
                    if (!date) return <View key={key} style={styles.dayCell} />;

                    const dayValue = dateValue(date);
                    const isSelected = dayValue === value;
                    const isFuture = dayValue > currentDate;
                    return (
                      <Pressable
                        key={key}
                        onPress={() => selectDay(date)}
                        disabled={isFuture}
                        accessibilityRole="button"
                        accessibilityLabel={date.toLocaleDateString('vi-VN')}
                        accessibilityState={{ selected: isSelected, disabled: isFuture }}
                        style={[
                          styles.dayCell,
                          isSelected && styles.daySelected,
                          isFuture && styles.dayDisabled,
                        ]}
                      >
                        <Text
                          style={[
                            styles.dayLabel,
                            isSelected && styles.dayLabelSelected,
                            isFuture && styles.dayLabelDisabled,
                          ]}
                        >
                          {date.getDate()}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </>
            )}

            <View style={styles.footer}>
              <Pressable
                onPress={() => setIsOpen(false)}
                accessibilityRole="button"
                style={styles.footerAction}
              >
                <Text style={styles.cancelLabel}>Hủy</Text>
              </Pressable>
              {value ? (
                <Pressable
                  onPress={() => {
                    onChange('');
                    setIsOpen(false);
                  }}
                  accessibilityRole="button"
                  style={styles.footerAction}
                >
                  <Text style={styles.clearLabel}>Xóa ngày sinh</Text>
                </Pressable>
              ) : null}
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  field: { gap: 7 },
  label: { color: colors.ink, fontSize: 12, fontWeight: '700' },
  input: {
    minHeight: 50,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 13,
    backgroundColor: colors.surface,
  },
  pressed: { backgroundColor: colors.accentSoft },
  value: { color: colors.ink, fontSize: 14 },
  placeholder: { color: colors.subtle },
  calendarIcon: { color: colors.accent, fontSize: 19 },
  overlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    backgroundColor: 'rgba(20, 30, 25, 0.46)',
  },
  dialog: {
    width: '100%',
    maxWidth: 380,
    maxHeight: '90%',
    padding: 20,
    borderRadius: 22,
    backgroundColor: colors.surface,
  },
  dialogHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  eyebrow: { color: colors.accent, fontSize: 9, letterSpacing: 1, fontWeight: '800' },
  title: { marginTop: 4, color: colors.ink, fontSize: 20, fontWeight: '700' },
  close: { color: colors.muted, fontSize: 28, lineHeight: 30 },
  monthHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  monthArrow: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    backgroundColor: '#F1F3EF',
  },
  arrowLabel: { color: colors.ink, fontSize: 26, lineHeight: 29 },
  monthTitleButton: { flexDirection: 'row', alignItems: 'center', gap: 6, padding: 8 },
  monthTitle: { color: colors.ink, fontSize: 14, fontWeight: '700' },
  yearChevron: { color: colors.accent, fontSize: 15 },
  calendarGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  weekday: {
    width: '14.2857%',
    paddingVertical: 8,
    color: colors.muted,
    fontSize: 11,
    textAlign: 'center',
    fontWeight: '700',
  },
  dayCell: {
    width: '14.2857%',
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 13,
  },
  daySelected: { backgroundColor: colors.accent },
  dayDisabled: { opacity: 0.35 },
  dayLabel: { color: colors.ink, fontSize: 13 },
  dayLabelSelected: { color: colors.surface, fontWeight: '700' },
  dayLabelDisabled: { color: colors.subtle },
  yearList: { maxHeight: 340 },
  yearGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  yearOption: {
    width: '30%',
    minHeight: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    backgroundColor: '#F1F3EF',
  },
  yearOptionSelected: { backgroundColor: colors.accent },
  yearLabel: { color: colors.ink, fontSize: 13 },
  yearLabelSelected: { color: colors.surface, fontWeight: '700' },
  footer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 18,
    marginTop: 16,
    paddingTop: 13,
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },
  footerAction: { paddingVertical: 6 },
  cancelLabel: { color: colors.ink, fontSize: 12, fontWeight: '700' },
  clearLabel: { color: colors.rose, fontSize: 12, fontWeight: '700' },
});
