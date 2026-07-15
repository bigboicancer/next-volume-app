import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { ActivityIndicator, SafeAreaView, StyleSheet, Text, View } from 'react-native';

import { BottomNav, MainTab } from './src/components/BottomNav';
import { useLibrary } from './src/hooks/useLibrary';
import { AddTitleModal } from './src/modals/AddTitleModal';
import { EditTitleModal } from './src/modals/EditTitleModal';
import { SeriesScreen } from './src/screens/SeriesScreen';
import { ShelfScreen } from './src/screens/ShelfScreen';
import { StatsScreen } from './src/screens/StatsScreen';
import { colors } from './src/theme';

export default function App() {
  const {
    titles,
    loading,
    addTitle,
    updateTitle,
    toggleVolume,
    toggleOwnedVolume,
    removeTitle,
    eraseAllData,
    exportBackup,
    chooseImportBackup,
    restoreBackup,
    getTitle,
  } = useLibrary();
  const [activeTab, setActiveTab] = useState<MainTab>('shelf');
  const [selectedId, setSelectedId] = useState<string>();
  const [addVisible, setAddVisible] = useState(false);
  const [editVisible, setEditVisible] = useState(false);
  const selected = selectedId ? getTitle(selectedId) : undefined;

  useEffect(() => {
    if (selectedId && !selected) {
      setSelectedId(undefined);
      setEditVisible(false);
    }
  }, [selected, selectedId]);

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar style="light" />
        <View style={styles.loading}>
          <View style={styles.loadingMark}>
            <Text style={styles.loadingMarkText}>NV</Text>
          </View>
          <ActivityIndicator color={colors.accent} />
          <Text style={styles.loadingText}>Opening your shelf…</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="light" />

      {selected ? (
        <SeriesScreen
          title={selected}
          onBack={() => setSelectedId(undefined)}
          onEdit={() => setEditVisible(true)}
          onToggleVolume={(volume) => toggleVolume(selected.id, volume)}
          onToggleOwnedVolume={(volume) => toggleOwnedVolume(selected.id, volume)}
          onUpdate={(update) => updateTitle(selected.id, update)}
        />
      ) : (
        <View style={styles.main}>
          {activeTab === 'shelf' ? (
            <ShelfScreen
              titles={titles}
              onAdd={() => setAddVisible(true)}
              onOpen={setSelectedId}
              onToggleVolume={toggleVolume}
            />
          ) : (
            <StatsScreen
              titles={titles}
              onEraseAllData={eraseAllData}
              onExportBackup={exportBackup}
              onChooseImportBackup={chooseImportBackup}
              onRestoreBackup={restoreBackup}
            />
          )}
          <BottomNav
            active={activeTab}
            onChange={setActiveTab}
            onAdd={() => setAddVisible(true)}
          />
        </View>
      )}

      <AddTitleModal
        visible={addVisible}
        existingTitles={titles}
        onClose={() => setAddVisible(false)}
        onAdd={addTitle}
      />
      <EditTitleModal
        visible={editVisible}
        title={selected}
        onClose={() => setEditVisible(false)}
        onSave={(update) => {
          if (selected) updateTitle(selected.id, update);
        }}
        onDelete={() => {
          if (selected) removeTitle(selected.id);
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    paddingBottom: 0,
    backgroundColor: colors.background,
  },
  main: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
  },
  loadingMark: {
    width: 64,
    height: 64,
    marginBottom: 6,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
    backgroundColor: colors.accent,
  },
  loadingMarkText: {
    color: colors.background,
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: -1,
  },
  loadingText: {
    color: colors.textMuted,
    fontSize: 13,
  },
});
