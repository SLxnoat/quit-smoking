import React, { useMemo, useState } from 'react';
import {
  FlatList,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from './text';
import { Card } from './card';
import { useTheme } from '../hooks/use-theme';
import { POPULAR_CURRENCIES } from '../domain/currencies';

export interface CurrencyPickerProps {
  value: string;
  onSelect: (currencyCode: string) => void;
  label?: string;
  testID?: string;
}

export function CurrencyPicker({
  value,
  onSelect,
  label = 'Currency',
  testID = 'currency-picker',
}: CurrencyPickerProps) {
  const { theme } = useTheme();
  const [modalVisible, setModalVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [customInput, setCustomInput] = useState('');

  const selectedCurrency = useMemo(() => {
    const upper = (value || 'USD').toUpperCase().trim();
    return (
      POPULAR_CURRENCIES.find((c) => c.code === upper) ?? {
        code: upper,
        symbol: value,
        name: 'Custom Currency',
      }
    );
  }, [value]);

  const filteredCurrencies = useMemo(() => {
    if (!searchQuery.trim()) return POPULAR_CURRENCIES;
    const q = searchQuery.toLowerCase().trim();
    return POPULAR_CURRENCIES.filter(
      (c) =>
        c.code.toLowerCase().includes(q) ||
        c.name.toLowerCase().includes(q) ||
        c.symbol.toLowerCase().includes(q)
    );
  }, [searchQuery]);

  const handleSelect = (code: string) => {
    onSelect(code);
    setModalVisible(false);
    setSearchQuery('');
  };

  const handleApplyCustom = () => {
    const trimmed = customInput.trim().toUpperCase();
    if (trimmed.length > 0) {
      onSelect(trimmed);
      setCustomInput('');
      setModalVisible(false);
      setSearchQuery('');
    }
  };

  return (
    <>
      <TouchableOpacity
        testID={testID}
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${selectedCurrency.code} (${selectedCurrency.symbol})`}
        accessibilityHint="Opens currency selector menu"
        onPress={() => setModalVisible(true)}
        style={[
          styles.triggerContainer,
          {
            backgroundColor: theme.colors.cardBackground,
            borderColor: theme.colors.cardBorder,
          },
        ]}
      >
        <View style={styles.triggerContent}>
          <Text variant="caption" color="secondary" style={styles.triggerLabel}>
            {label}
          </Text>
          <View style={styles.triggerRow}>
            <Text variant="bodyMedium" color="primary" style={{ fontWeight: '600' }}>
              {selectedCurrency.code}
            </Text>
            <Text variant="bodySmall" color="secondary" style={{ marginLeft: 6 }}>
              ({selectedCurrency.symbol})
            </Text>
          </View>
        </View>
        <Ionicons name="chevron-down" size={18} color={theme.colors.textSecondary} />
      </TouchableOpacity>

      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setModalVisible(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setModalVisible(false)}
          accessibilityRole="button"
          accessibilityLabel="Close currency selector"
        >
          <Pressable
            style={[
              styles.modalSheet,
              {
                backgroundColor: theme.isDark ? '#142125' : '#FFFFFF',
                borderColor: theme.colors.cardBorder,
              },
            ]}
            onPress={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <View style={styles.modalHeader}>
              <View>
                <Text variant="title3" color="primary">
                  Select Currency
                </Text>
                <Text variant="caption" color="secondary">
                  Choose your local currency for tracking savings
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setModalVisible(false)}
                accessibilityLabel="Close"
                style={styles.closeBtn}
              >
                <Ionicons name="close" size={24} color={theme.colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* Search Input */}
            <View
              style={[
                styles.searchBox,
                {
                  backgroundColor: theme.colors.card,
                  borderColor: theme.colors.cardBorder,
                },
              ]}
            >
              <Ionicons
                name="search-outline"
                size={18}
                color={theme.colors.textTertiary}
                style={{ marginRight: 8 }}
              />
              <TextInput
                style={[styles.searchInput, { color: theme.colors.textPrimary }]}
                placeholder="Search by code, symbol or country (e.g. LKR, $, Euro)"
                placeholderTextColor={theme.colors.textTertiary}
                value={searchQuery}
                onChangeText={setSearchQuery}
                autoCapitalize="none"
                clearButtonMode="while-editing"
              />
            </View>

            {/* Currency Options List */}
            <FlatList
              data={filteredCurrencies}
              keyExtractor={(item) => item.code}
              keyboardShouldPersistTaps="handled"
              style={styles.list}
              renderItem={({ item }) => {
                const isSelected = item.code === selectedCurrency.code;
                return (
                  <TouchableOpacity
                    onPress={() => handleSelect(item.code)}
                    accessibilityRole="button"
                    accessibilityState={{ selected: isSelected }}
                    accessibilityLabel={`${item.code}, ${item.symbol}, ${item.name}`}
                    style={[
                      styles.currencyItem,
                      {
                        backgroundColor: isSelected
                          ? `${theme.colors.primary}18`
                          : 'transparent',
                        borderColor: isSelected
                          ? theme.colors.primary
                          : theme.colors.cardBorder,
                      },
                    ]}
                  >
                    <View style={styles.currencyItemLeft}>
                      <View
                        style={[
                          styles.symbolBadge,
                          {
                            backgroundColor: isSelected
                              ? theme.colors.primary
                              : `${theme.colors.textTertiary}22`,
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.symbolText,
                            {
                              color: isSelected ? '#FFFFFF' : theme.colors.textPrimary,
                            },
                          ]}
                        >
                          {item.symbol}
                        </Text>
                      </View>
                      <View style={{ marginLeft: 12 }}>
                        <Text variant="bodyMedium" color="primary" style={{ fontWeight: '700' }}>
                          {item.code}
                        </Text>
                        <Text variant="caption" color="secondary">
                          {item.name}
                        </Text>
                      </View>
                    </View>

                    {isSelected && (
                      <Ionicons
                        name="checkmark-circle"
                        size={22}
                        color={theme.colors.primary}
                      />
                    )}
                  </TouchableOpacity>
                );
              }}
              ListFooterComponent={
                <Card
                  variant="outlined"
                  padding="md"
                  style={[styles.customCard, { borderColor: theme.colors.cardBorder }]}
                >
                  <Text variant="subtitle" color="primary">
                    Custom Currency
                  </Text>
                  <Text variant="caption" color="secondary" style={{ marginTop: 2, marginBottom: 8 }}>
                    Don&apos;t see your currency? Enter code or symbol manually (e.g., LKR, AED)
                  </Text>
                  <View style={styles.customRow}>
                    <TextInput
                      style={[
                        styles.customInput,
                        {
                          backgroundColor: theme.colors.card,
                          color: theme.colors.textPrimary,
                          borderColor: theme.colors.cardBorder,
                        },
                      ]}
                      placeholder="Code (e.g. LKR)"
                      placeholderTextColor={theme.colors.textTertiary}
                      value={customInput}
                      onChangeText={setCustomInput}
                      maxLength={6}
                      autoCapitalize="characters"
                    />
                    <TouchableOpacity
                      onPress={handleApplyCustom}
                      style={[styles.applyBtn, { backgroundColor: theme.colors.primary }]}
                      accessibilityRole="button"
                      accessibilityLabel="Apply custom currency"
                    >
                      <Text style={styles.applyBtnText}>Apply</Text>
                    </TouchableOpacity>
                  </View>
                </Card>
              }
            />
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  triggerContainer: {
    height: 52,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  triggerContent: {
    flex: 1,
  },
  triggerLabel: {
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  triggerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    maxHeight: '82%',
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 14,
  },
  closeBtn: {
    padding: 6,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    marginBottom: 12,
    paddingHorizontal: 12,
    height: 44,
    borderWidth: 1,
    borderRadius: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    paddingVertical: 0,
  },
  list: {
    paddingHorizontal: 20,
  },
  currencyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    marginBottom: 6,
    borderWidth: 1,
  },
  currencyItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  symbolBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  symbolText: {
    fontWeight: '700',
    fontSize: 14,
  },
  customCard: {
    marginTop: 12,
    marginBottom: 20,
  },
  customRow: {
    flexDirection: 'row',
    gap: 8,
  },
  customInput: {
    flex: 1,
    height: 40,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    fontSize: 14,
  },
  applyBtn: {
    paddingHorizontal: 16,
    height: 40,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  applyBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
});
