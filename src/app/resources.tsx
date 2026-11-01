import React from 'react';
import {
  Alert,
  Linking,
  Platform,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Card, Screen, Text } from '../components';
import { useTheme } from '../hooks/use-theme';

interface Helpline {
  country: string;
  name: string;
  displayNumber: string;
  dialNumber: string;
  description: string;
  hours: string;
}

const QUITLINES: Helpline[] = [
  {
    country: 'United States',
    name: 'National Quitline Network',
    displayNumber: '1-800-QUIT-NOW',
    dialNumber: '18007848669',
    description: 'Free confidential coaching, quit plan development, and local support resources.',
    hours: '24/7 (English & Spanish)',
  },
  {
    country: 'United States (Crisis)',
    name: 'Crisis Text Line & 988 Lifeline',
    displayNumber: '988 / Text HOME to 741741',
    dialNumber: '988',
    description: 'Free, 24/7 mental health crisis support and acute distress coping.',
    hours: '24/7 Confidential Support',
  },
  {
    country: 'United Kingdom',
    name: 'NHS Smokefree Helpline',
    displayNumber: '0300 123 1044',
    dialNumber: '03001231044',
    description: 'Free expert NHS advisors and referral to your local Stop Smoking Service.',
    hours: 'Mon-Fri 9am-8pm, Sat-Sun 11am-4pm',
  },
  {
    country: 'Canada',
    name: 'Pan-Canadian Quitline',
    displayNumber: '1-866-366-3667',
    dialNumber: '18663663667',
    description: 'Toll-free quitline connecting to provincial health coaches and quit plans.',
    hours: 'Toll-free across Canada',
  },
  {
    country: 'Australia',
    name: 'Quitline Australia',
    displayNumber: '13 7848 (13 QUIT)',
    dialNumber: '137848',
    description: 'Confidential telephone counselling and personalized strategies to quit.',
    hours: 'Mon-Fri 8am-8pm AEST',
  },
  {
    country: 'New Zealand',
    name: 'Quitline Aotearoa',
    displayNumber: '0800 778 778',
    dialNumber: '0800778778',
    description: 'Free phone and text support for smoking and vaping cessation.',
    hours: '24/7 Support',
  },
];

const CLINICAL_SOURCES = [
  {
    title: 'World Health Organization (WHO)',
    citation:
      'WHO Report on the Global Tobacco Epidemic (2021) & Clinical Treatment Guidelines for Tobacco Cessation.',
    summary: 'Health recovery timelines, blood pressure normalization, and cardiovascular risk reduction benchmarks.',
  },
  {
    title: 'US Surgeon General & CDC',
    citation:
      'Smoking Cessation: A Report of the Surgeon General (2020) & CDC Benefits of Quitting Smoking.',
    summary: 'Evidence-based nicotine withdrawal symptom curves, carbon monoxide clearance, and lung cilia regeneration.',
  },
  {
    title: 'Cochrane Tobacco Addiction Group',
    citation:
      'Hartmann-Boyce J, et al. Behavioural interventions and mobile phone-based support for smoking cessation (2023).',
    summary: 'Systematic validation of cognitive reframing, urge surfing, and 3-minute somatic grounding techniques.',
  },
  {
    title: 'NICE Guidelines (NG209)',
    citation:
      'National Institute for Health and Care Excellence: Tobacco: preventing uptake, promoting quitting and treating dependence (2021).',
    summary: 'Clinical recommendations for relapse prevention, trigger restructuring, and supportive accountability.',
  },
];

const LICENSES = [
  { name: 'React Native', license: 'MIT License', copyright: 'Meta Platforms, Inc.' },
  { name: 'Expo SDK', license: 'MIT License', copyright: '650 Industries, Inc.' },
  { name: 'SQLite (libsqlite3)', license: 'Public Domain', copyright: 'SQLite Consortium' },
  { name: 'React Native Reanimated', license: 'MIT License', copyright: 'Software Mansion' },
  { name: 'Zod Validator', license: 'MIT License', copyright: 'Colin McDonnell' },
  { name: 'Ionicons', license: 'MIT License', copyright: 'Ionic Team' },
];

export default function ResourcesScreen() {
  const { theme } = useTheme();

  const handleCall = async (item: Helpline) => {
    const url = Platform.OS === 'ios' ? `telprompt:${item.dialNumber}` : `tel:${item.dialNumber}`;
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        Alert.alert('Phone Dialing', `Please dial ${item.displayNumber} directly from your phone.`);
      }
    } catch {
      Alert.alert('Phone Dialing', `Please dial ${item.displayNumber} directly.`);
    }
  };

  return (
    <Screen style={{ flex: 1 }}>
      {/* Top Navigation Bar */}
      <View
        style={[
          styles.topBar,
          {
            backgroundColor: theme.colors.background,
            borderBottomColor: theme.colors.cardBorder,
          },
        ]}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text variant="title3" color="primary" style={styles.topBarTitle}>
          Resources &amp; Clinical Info
        </Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* SECTION 1: VERIFIED QUITLINES */}
        <View style={styles.sectionHeader}>
          <Ionicons name="call" size={22} color={theme.colors.primary} />
          <Text variant="title2" color="primary" style={styles.sectionTitle}>
            Verified Quitlines &amp; Helplines
          </Text>
        </View>
        <Text variant="bodySmall" color="secondary" style={styles.sectionIntro}>
          If you are experiencing difficult cravings or distress, free trained cessation
          counsellors are available. Tap any helpline to dial directly.
        </Text>

        <View style={styles.cardsList}>
          {QUITLINES.map((h) => (
            <TouchableOpacity
              key={h.country + h.name}
              onPress={() => void handleCall(h)}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel={`Call ${h.name} at ${h.displayNumber}`}
            >
              <Card variant="elevated" padding="md" style={styles.itemCard}>
                <View style={styles.helplineHeader}>
                  <View style={{ flex: 1 }}>
                    <Text variant="caption" color="brand" style={{ fontWeight: '700' }}>
                      {h.country.toUpperCase()}
                    </Text>
                    <Text variant="bodyMedium" color="primary" style={{ marginTop: 2 }}>
                      {h.name}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.phoneBadge,
                      { backgroundColor: `${theme.colors.primary}18` },
                    ]}
                  >
                    <Ionicons name="call-outline" size={18} color={theme.colors.primary} />
                  </View>
                </View>

                <Text
                  variant="body"
                  color="brand"
                  style={{ fontWeight: '700', marginTop: 8 }}
                >
                  {h.displayNumber}
                </Text>

                <Text
                  variant="caption"
                  color="secondary"
                  style={{ marginTop: 4, lineHeight: 18 }}
                >
                  {h.description}
                </Text>

                <View style={styles.hoursRow}>
                  <Ionicons name="time-outline" size={13} color={theme.colors.textSecondary} />
                  <Text variant="caption" color="secondary" style={{ marginLeft: 4 }}>
                    {h.hours}
                  </Text>
                </View>
              </Card>
            </TouchableOpacity>
          ))}
        </View>

        {/* SECTION 2: MEDICAL DISCLAIMER */}
        <View style={[styles.sectionHeader, { marginTop: 32 }]}>
          <Ionicons name="medical" size={22} color={theme.colors.danger} />
          <Text variant="title2" color="primary" style={styles.sectionTitle}>
            Medical Disclaimer
          </Text>
        </View>

        <Card
          variant="outlined"
          padding="md"
          style={[styles.itemCard, { borderColor: `${theme.colors.danger}40` }]}
        >
          <Text
            variant="bodySmall"
            color="primary"
            style={{ fontWeight: '700', marginBottom: 8 }}
          >
            Not a Medical Device or Clinical Treatment
          </Text>
          <Text variant="caption" color="secondary" style={styles.disclaimerText}>
            Ember is a self-management and educational companion designed to support smoking
            cessation using behavioral strategies (CBT reframing, urge surfing, and habit tracking).
            Ember does not provide medical diagnosis, clinical treatment, or prescription therapy.
          </Text>
          <Text variant="caption" color="secondary" style={[styles.disclaimerText, { marginTop: 8 }]}>
            Withdrawal from nicotine may cause transient somatic and psychological symptoms, including
            irritability, sleep disturbances, anxiety, or coughing as cilia clear. If you have
            pre-existing cardiovascular disease, psychiatric illness, or are pregnant, please consult
            a licensed medical professional regarding personalized cessation plans and pharmacotherapy
            (e.g., NRT, bupropion, varenicline).
          </Text>
        </Card>

        {/* SECTION 3: EVIDENCE & SOURCES */}
        <View style={[styles.sectionHeader, { marginTop: 32 }]}>
          <Ionicons name="book-outline" size={22} color={theme.colors.primary} />
          <Text variant="title2" color="primary" style={styles.sectionTitle}>
            Scientific Sources &amp; Clinical Evidence
          </Text>
        </View>
        <Text variant="bodySmall" color="secondary" style={styles.sectionIntro}>
          All health timelines, milestones, and psychoeducational lessons in Ember are derived
          directly from peer-reviewed clinical research and health authority publications:
        </Text>

        <View style={styles.cardsList}>
          {CLINICAL_SOURCES.map((s) => (
            <Card key={s.title} variant="elevated" padding="md" style={styles.itemCard}>
              <Text variant="bodyMedium" color="primary">
                {s.title}
              </Text>
              <Text
                variant="caption"
                color="brand"
                style={{ fontStyle: 'italic', marginTop: 4, lineHeight: 18 }}
              >
                {s.citation}
              </Text>
              <Text
                variant="caption"
                color="secondary"
                style={{ marginTop: 6, lineHeight: 18 }}
              >
                {s.summary}
              </Text>
            </Card>
          ))}
        </View>

        {/* SECTION 4: PRIVACY & OPEN SOURCE LICENSES */}
        <View style={[styles.sectionHeader, { marginTop: 32 }]}>
          <Ionicons name="shield-checkmark-outline" size={22} color={theme.colors.success} />
          <Text variant="title2" color="primary" style={styles.sectionTitle}>
            Open Source Software &amp; Privacy
          </Text>
        </View>

        <Card variant="flat" padding="md" style={styles.itemCard}>
          <Text
            variant="bodySmall"
            color="primary"
            style={{ fontWeight: '700', marginBottom: 6 }}
          >
            Zero-Telemetry &amp; Local Storage Commitment
          </Text>
          <Text variant="caption" color="secondary" style={{ lineHeight: 18, marginBottom: 16 }}>
            Ember does not transmit personal data, logs, or analytics to remote servers. All your
            data resides in an offline SQLite database on your device and can be backed up or wiped
            at any time in Settings.
          </Text>

          <Text variant="caption" color="primary" style={{ fontWeight: '700', marginBottom: 8 }}>
            Third-Party Open Source Components:
          </Text>
          {LICENSES.map((lic) => (
            <View key={lic.name} style={styles.licenseRow}>
              <Text variant="caption" color="primary" style={{ fontWeight: '600' }}>
                {lic.name}
              </Text>
              <Text variant="caption" color="secondary">
                {lic.license} &middot; {lic.copyright}
              </Text>
            </View>
          ))}
        </Card>

        <View style={{ height: 40 }} />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  topBar: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backButton: {
    padding: 8,
    marginLeft: -8,
  },
  topBarTitle: {
    fontWeight: '700',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 40,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  sectionTitle: {
    marginLeft: 10,
    fontWeight: '700',
  },
  sectionIntro: {
    lineHeight: 20,
    marginBottom: 16,
  },
  cardsList: {
    gap: 12,
  },
  itemCard: {
    borderRadius: 16,
  },
  helplineHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  phoneBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  hoursRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  disclaimerText: {
    lineHeight: 19,
  },
  licenseRow: {
    paddingVertical: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#88888820',
  },
});
