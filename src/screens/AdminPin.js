// src/screens/adminPin.js

import React, { useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const DEFAULT_USER_PIN = globalThis.CUSIIK_USER_PIN || '1111';
const DEFAULT_ADMIN_PIN = globalThis.CUSIIK_ADMIN_PIN || '2242';
const DEFAULT_ADMIN_STATUS = globalThis.CUSIIK_ADMIN_STATUS || 'off';

const USER_COLOURS = [
  { label: 'Zelená', value: '#35c759' },
  { label: 'Červená', value: '#ff3b30' },
  { label: 'Žlutá', value: '#ffcc00' },
  { label: 'Oranžová', value: '#ff9500' },
  { label: 'Fialová', value: '#af52de' },
  { label: 'Černá', value: '#111111' },
  { label: 'Hnědá', value: '#8b5a2b' },
  { label: 'Tyrkysová', value: '#40e0d0' },
];

const getGlobalMutedUsers = () => {
  if (!globalThis.CUSIIK_MUTED_USERS) {
    globalThis.CUSIIK_MUTED_USERS = {};
  }

  return globalThis.CUSIIK_MUTED_USERS;
};

const getMuteMinutesLeft = (userId, nowTick) => {
  const mutedUsers = getGlobalMutedUsers();
  const muteUntil = mutedUsers[userId] || 0;
  const diff = muteUntil - nowTick;

  if (diff <= 0) {
    return 0;
  }

  return Math.ceil(diff / 1000 / 60);
};

const AdminPin = ({ navigation }) => {
  const [users, setUsers] = useState([
    { id: '1', name: 'Uzivatel 1', status: 'online', colour: '#dceaff' },
    { id: '2', name: 'Uzivatel 2', status: 'online', colour: '#dceaff' },
    { id: '3', name: 'Host 224', status: 'online', colour: '#dceaff' },
  ]);

  const [nowTick, setNowTick] = useState(Date.now());

  const [currentUserPin, setCurrentUserPin] = useState(DEFAULT_USER_PIN);
  const [currentAdminPin, setCurrentAdminPin] = useState(DEFAULT_ADMIN_PIN);
  const [adminStatus, setAdminStatus] = useState(DEFAULT_ADMIN_STATUS);

  const [renameModalVisible, setRenameModalVisible] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [newUserName, setNewUserName] = useState('');

  const [changeModalVisible, setChangeModalVisible] = useState(false);
  const [newPin, setNewPin] = useState('');
  const [changeError, setChangeError] = useState('');

  const [settingsModalVisible, setSettingsModalVisible] = useState(false);
  const [settingsScreen, setSettingsScreen] = useState('menu');

  const [userToKick, setUserToKick] = useState(null);

  const [newAdminPin, setNewAdminPin] = useState('');
  const [adminPinError, setAdminPinError] = useState('');

  const [userForColour, setUserForColour] = useState(null);

  const [lastActionText, setLastActionText] = useState('');

  const isAdminOnline = adminStatus === 'on';

  useEffect(() => {
    const interval = setInterval(() => {
      setNowTick(Date.now());
    }, 15000);

    return () => clearInterval(interval);
  }, []);

  const renderUserNameWithMute = (user, textStyle) => {
    const minutesLeft = getMuteMinutesLeft(user.id, nowTick);

    return (
      <Text style={textStyle}>
        {user.name}
        {minutesLeft > 0 ? (
          <Text style={styles.mutedMinutesText}> ({minutesLeft} min)</Text>
        ) : null}
      </Text>
    );
  };

  const openAdminChat = (user) => {
    navigation.navigate('AdminChat', {
      userId: user.id,
      userName: user.name,
    });
  };

  const toggleAdminStatus = () => {
    const nextStatus = adminStatus === 'on' ? 'off' : 'on';

    globalThis.CUSIIK_ADMIN_STATUS = nextStatus;
    setAdminStatus(nextStatus);

    setLastActionText(
      nextStatus === 'on'
        ? 'Status admina byl přepnut na ON.'
        : 'Status admina byl přepnut na OFF.'
    );
  };

  const openRenameModal = (user) => {
    setSelectedUser(user);
    setNewUserName(user.name);
    setRenameModalVisible(true);
  };

  const closeRenameModal = () => {
    setRenameModalVisible(false);
    setSelectedUser(null);
    setNewUserName('');
  };

  const saveRename = () => {
    const trimmedName = newUserName.trim();

    if (!selectedUser || !trimmedName) {
      return;
    }

    setUsers((currentUsers) =>
      currentUsers.map((user) =>
        user.id === selectedUser.id
          ? {
              ...user,
              name: trimmedName,
            }
          : user
      )
    );

    setLastActionText(`Uživatel byl přejmenován na ${trimmedName}.`);
    closeRenameModal();
  };

  const openChangeModal = () => {
    setNewPin('');
    setChangeError('');
    setChangeModalVisible(true);
  };

  const closeChangeModal = () => {
    setChangeModalVisible(false);
    setNewPin('');
    setChangeError('');
  };

  const saveChangeAndKickUsers = () => {
    const cleanedPin = newPin.replace(/[^0-9]/g, '').slice(0, 4);

    if (cleanedPin.length !== 4) {
      setChangeError('PIN musí mít přesně 4 číslice.');
      return;
    }

    globalThis.CUSIIK_USER_PIN = cleanedPin;

    setCurrentUserPin(cleanedPin);
    setUsers([]);
    setLastActionText(
      `Změna hotová. Nový uživatelský PIN je ${cleanedPin}. Všichni uživatelé byli vykopnuti.`
    );

    closeChangeModal();
  };

  const openSettings = () => {
    setSettingsScreen('menu');
    setUserToKick(null);
    setUserForColour(null);
    setNewAdminPin('');
    setAdminPinError('');
    setSettingsModalVisible(true);
  };

  const closeSettings = () => {
    setSettingsModalVisible(false);
    setSettingsScreen('menu');
    setUserToKick(null);
    setUserForColour(null);
    setNewAdminPin('');
    setAdminPinError('');
  };

  const goBackToSettingsMenu = () => {
    setSettingsScreen('menu');
    setUserToKick(null);
    setUserForColour(null);
    setNewAdminPin('');
    setAdminPinError('');
  };

  const chooseUserToKick = (user) => {
    setUserToKick(user);
    setSettingsScreen('kickConfirm');
  };

  const confirmKickUser = () => {
    if (!userToKick) {
      return;
    }

    setUsers((currentUsers) =>
      currentUsers.filter((user) => user.id !== userToKick.id)
    );

    setLastActionText(`Uživatel ${userToKick.name} byl kicknut z roomky.`);
    goBackToSettingsMenu();
  };

  const saveNewAdminPin = () => {
    const cleanedPin = newAdminPin.replace(/[^0-9]/g, '').slice(0, 4);

    if (cleanedPin.length !== 4) {
      setAdminPinError('Admin PIN musí mít přesně 4 číslice.');
      return;
    }

    globalThis.CUSIIK_ADMIN_PIN = cleanedPin;

    setCurrentAdminPin(cleanedPin);
    setLastActionText(`Admin PIN byl změněn na ${cleanedPin}.`);

    goBackToSettingsMenu();
  };

  const chooseUserForColour = (user) => {
    setUserForColour(user);
    setSettingsScreen('colourPick');
  };

  const changeUserColour = (colour) => {
    if (!userForColour) {
      return;
    }

    setUsers((currentUsers) =>
      currentUsers.map((user) =>
        user.id === userForColour.id
          ? {
              ...user,
              colour,
            }
          : user
      )
    );

    setLastActionText(`Barva uživatele ${userForColour.name} byla změněna.`);
    goBackToSettingsMenu();
  };

  const renderSettingsContent = () => {
    if (settingsScreen === 'kick') {
      return (
        <View style={styles.modalBody}>
          <Text style={styles.modalLabel}>Vyber uživatele ke kicku:</Text>

          {users.length === 0 ? (
            <View style={styles.smallEmptyBox}>
              <Text style={styles.smallEmptyText}>
                V roomce teď není žádný uživatel.
              </Text>
            </View>
          ) : (
            <ScrollView style={styles.settingsList}>
              {users.map((user) => (
                <Pressable
                  key={user.id}
                  style={({ pressed }) => [
                    styles.settingsUserRow,
                    pressed && styles.xpButtonPressed,
                  ]}
                  onPress={() => chooseUserToKick(user)}
                >
                  <View
                    style={[
                      styles.smallUserIconBox,
                      { backgroundColor: user.colour },
                    ]}
                  >
                    <Text style={styles.smallUserIcon}>👤</Text>
                  </View>

                  <View style={styles.settingsUserTextBox}>
                    {renderUserNameWithMute(user, styles.settingsUserName)}
                    <Text style={styles.settingsUserSubText}>
                      Kliknutím vybereš ke kicku
                    </Text>
                  </View>
                </Pressable>
              ))}
            </ScrollView>
          )}

          <View style={styles.modalButtons}>
            <Pressable
              style={({ pressed }) => [
                styles.modalButton,
                pressed && styles.xpButtonPressed,
              ]}
              onPress={goBackToSettingsMenu}
            >
              <Text style={styles.modalButtonText}>Zpět</Text>
            </Pressable>
          </View>
        </View>
      );
    }

    if (settingsScreen === 'kickConfirm') {
      return (
        <View style={styles.modalBody}>
          <Text style={styles.confirmIcon}>⚠️</Text>

          <Text style={styles.confirmTitle}>
            Opravdu chceš kicknout uživatele?
          </Text>

          <Text style={styles.confirmUserName}>
            {userToKick ? userToKick.name : ''}
          </Text>

          <View style={styles.warningBox}>
            <Text style={styles.warningText}>
              Uživatel bude odstraněn ze seznamu uživatelů v roomce.
            </Text>
          </View>

          <View style={styles.modalButtons}>
            <Pressable
              style={({ pressed }) => [
                styles.modalButton,
                pressed && styles.xpButtonPressed,
              ]}
              onPress={confirmKickUser}
            >
              <Text style={styles.modalButtonText}>Ano, kicknout</Text>
            </Pressable>

            <Pressable
              style={({ pressed }) => [
                styles.modalButton,
                pressed && styles.xpButtonPressed,
              ]}
              onPress={() => setSettingsScreen('kick')}
            >
              <Text style={styles.modalButtonText}>Ne</Text>
            </Pressable>
          </View>
        </View>
      );
    }

    if (settingsScreen === 'adminPin') {
      return (
        <View style={styles.modalBody}>
          <Text style={styles.modalLabel}>Nastavit nový admin PIN:</Text>

          <TextInput
            value={newAdminPin}
            onChangeText={(value) => {
              setAdminPinError('');
              setNewAdminPin(value.replace(/[^0-9]/g, '').slice(0, 4));
            }}
            style={styles.modalInput}
            placeholder="Např. 9876"
            placeholderTextColor="#666666"
            autoFocus
            maxLength={4}
            keyboardType="number-pad"
            inputMode="numeric"
          />

          <View style={styles.warningBox}>
            <Text style={styles.warningText}>
              Aktuální admin PIN: {currentAdminPin}
            </Text>
          </View>

          {adminPinError ? (
            <Text style={styles.errorText}>{adminPinError}</Text>
          ) : null}

          <View style={styles.modalButtons}>
            <Pressable
              style={({ pressed }) => [
                styles.modalButton,
                pressed && styles.xpButtonPressed,
              ]}
              onPress={saveNewAdminPin}
            >
              <Text style={styles.modalButtonText}>Uložit</Text>
            </Pressable>

            <Pressable
              style={({ pressed }) => [
                styles.modalButton,
                pressed && styles.xpButtonPressed,
              ]}
              onPress={goBackToSettingsMenu}
            >
              <Text style={styles.modalButtonText}>Zpět</Text>
            </Pressable>
          </View>
        </View>
      );
    }

    if (settingsScreen === 'colourUser') {
      return (
        <View style={styles.modalBody}>
          <Text style={styles.modalLabel}>Vyber uživatele pro změnu barvy:</Text>

          {users.length === 0 ? (
            <View style={styles.smallEmptyBox}>
              <Text style={styles.smallEmptyText}>
                V roomce teď není žádný uživatel.
              </Text>
            </View>
          ) : (
            <ScrollView style={styles.settingsList}>
              {users.map((user) => (
                <Pressable
                  key={user.id}
                  style={({ pressed }) => [
                    styles.settingsUserRow,
                    pressed && styles.xpButtonPressed,
                  ]}
                  onPress={() => chooseUserForColour(user)}
                >
                  <View
                    style={[
                      styles.smallUserIconBox,
                      { backgroundColor: user.colour },
                    ]}
                  >
                    <Text style={styles.smallUserIcon}>👤</Text>
                  </View>

                  <View style={styles.settingsUserTextBox}>
                    {renderUserNameWithMute(user, styles.settingsUserName)}
                    <Text style={styles.settingsUserSubText}>
                      Kliknutím vybereš barvu
                    </Text>
                  </View>
                </Pressable>
              ))}
            </ScrollView>
          )}

          <View style={styles.modalButtons}>
            <Pressable
              style={({ pressed }) => [
                styles.modalButton,
                pressed && styles.xpButtonPressed,
              ]}
              onPress={goBackToSettingsMenu}
            >
              <Text style={styles.modalButtonText}>Zpět</Text>
            </Pressable>
          </View>
        </View>
      );
    }

    if (settingsScreen === 'colourPick') {
      return (
        <View style={styles.modalBody}>
          <Text style={styles.modalLabel}>Vyber barvu pro uživatele:</Text>

          <Text style={styles.selectedUserText}>
            {userForColour ? userForColour.name : ''}
          </Text>

          <View style={styles.colourGrid}>
            {USER_COLOURS.map((colour) => (
              <Pressable
                key={colour.value}
                style={({ pressed }) => [
                  styles.colourButton,
                  pressed && styles.xpButtonPressed,
                ]}
                onPress={() => changeUserColour(colour.value)}
              >
                <View
                  style={[
                    styles.colourPreview,
                    { backgroundColor: colour.value },
                  ]}
                />

                <Text style={styles.colourButtonText}>{colour.label}</Text>
              </Pressable>
            ))}
          </View>

          <View style={styles.modalButtons}>
            <Pressable
              style={({ pressed }) => [
                styles.modalButton,
                pressed && styles.xpButtonPressed,
              ]}
              onPress={() => setSettingsScreen('colourUser')}
            >
              <Text style={styles.modalButtonText}>Zpět</Text>
            </Pressable>
          </View>
        </View>
      );
    }

    return (
      <View style={styles.modalBody}>
        <Text style={styles.modalLabel}>Vyber akci v nastavení:</Text>

        <Pressable
          style={({ pressed }) => [
            styles.statusOption,
            isAdminOnline ? styles.statusOptionOn : styles.statusOptionOff,
            pressed && styles.xpButtonPressed,
          ]}
          onPress={toggleAdminStatus}
        >
          <View style={styles.statusOptionTop}>
            <View
              style={[
                styles.statusDot,
                isAdminOnline ? styles.statusDotOn : styles.statusDotOff,
              ]}
            />

            <Text style={styles.statusOptionTitle}>
              Status admina: {isAdminOnline ? 'ON' : 'OFF'}
            </Text>
          </View>

          <Text style={styles.statusOptionText}>
            Kliknutím přepneš stav, který uvidí uživatel v chatu.
          </Text>
        </Pressable>

        <Pressable
          style={({ pressed }) => [
            styles.settingsOption,
            pressed && styles.xpButtonPressed,
          ]}
          onPress={() => setSettingsScreen('kick')}
        >
          <Text style={styles.settingsOptionTitle}>Kick uživatele</Text>
          <Text style={styles.settingsOptionText}>
            Vybereš uživatele a potvrdíš jeho kick.
          </Text>
        </Pressable>

        <Pressable
          style={({ pressed }) => [
            styles.settingsOption,
            pressed && styles.xpButtonPressed,
          ]}
          onPress={() => setSettingsScreen('adminPin')}
        >
          <Text style={styles.settingsOptionTitle}>Admin PIN</Text>
          <Text style={styles.settingsOptionText}>
            Nastavíš nový PIN pro vstup do admin panelu.
          </Text>
        </Pressable>

        <Pressable
          style={({ pressed }) => [
            styles.settingsOption,
            pressed && styles.xpButtonPressed,
          ]}
          onPress={() => setSettingsScreen('colourUser')}
        >
          <Text style={styles.settingsOptionTitle}>Změna barvy uživatele</Text>
          <Text style={styles.settingsOptionText}>
            Změníš barvu ikonky vybraného uživatele.
          </Text>
        </Pressable>

        <View style={styles.modalButtons}>
          <Pressable
            style={({ pressed }) => [
              styles.modalButton,
              pressed && styles.xpButtonPressed,
            ]}
            onPress={closeSettings}
          >
            <Text style={styles.modalButtonText}>Zavřít</Text>
          </Pressable>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <StatusBar barStyle="light-content" backgroundColor="#0058d8" />

      <KeyboardAvoidingView
        style={styles.page}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.window}>
          <View style={styles.titleBar}>
            <View style={styles.titleLeft}>
              <View style={styles.windowsIcon}>
                <View style={[styles.winSquare, { backgroundColor: '#f35325' }]} />
                <View style={[styles.winSquare, { backgroundColor: '#81bc06' }]} />
                <View style={[styles.winSquare, { backgroundColor: '#05a6f0' }]} />
                <View style={[styles.winSquare, { backgroundColor: '#ffba08' }]} />
              </View>

              <Text style={styles.titleText}>Admin panel</Text>
            </View>

            <View style={styles.windowButtons}>
              <View style={styles.windowButton}>
                <Text style={styles.windowButtonText}>_</Text>
              </View>

              <View style={styles.windowButton}>
                <Text style={styles.windowButtonText}>□</Text>
              </View>

              <View style={[styles.windowButton, styles.closeButton]}>
                <Text style={[styles.windowButtonText, styles.closeButtonText]}>×</Text>
              </View>
            </View>
          </View>

          <View style={styles.body}>
            <View style={styles.topInfoPanel}>
              <Text style={styles.topInfoText}>
                Uživatelský PIN: <Text style={styles.pinText}>{currentUserPin}</Text>
              </Text>

              <View style={styles.adminStatusRow}>
                <View
                  style={[
                    styles.adminStatusDot,
                    isAdminOnline ? styles.statusDotOn : styles.statusDotOff,
                  ]}
                />
                <Text style={styles.topInfoText}>
                  Admin status:{' '}
                  <Text style={styles.pinText}>{isAdminOnline ? 'ON' : 'OFF'}</Text>
                </Text>
              </View>
            </View>

            <View style={styles.usersPanel}>
              <View style={styles.panelTitleBar}>
                <Text style={styles.panelTitleText}>Uživatelé v roomce</Text>
                <Text style={styles.panelCountText}>{users.length} online</Text>
              </View>

              <ScrollView
                style={styles.usersScroll}
                contentContainerStyle={styles.usersContent}
                showsVerticalScrollIndicator={false}
              >
                {users.length === 0 ? (
                  <View style={styles.emptyBox}>
                    <Text style={styles.emptyIcon}>🚪</Text>
                    <Text style={styles.emptyTitle}>Roomka je prázdná</Text>
                    <Text style={styles.emptyText}>
                      Všichni uživatelé byli vykopnuti nebo se zatím nikdo nepřipojil.
                    </Text>
                  </View>
                ) : (
                  users.map((user) => (
                    <View key={user.id} style={styles.userRow}>
                      <Pressable
                        style={({ pressed }) => [
                          styles.userInfo,
                          pressed && styles.userInfoPressed,
                        ]}
                        onPress={() => openAdminChat(user)}
                      >
                        <View
                          style={[
                            styles.userIconBox,
                            { backgroundColor: user.colour },
                          ]}
                        >
                          <Text style={styles.userIcon}>👤</Text>
                        </View>

                        <View style={styles.userTextBox}>
                          {renderUserNameWithMute(user, styles.userName)}
                          <Text style={styles.userStatus}>
                            Klikni pro otevření chatu
                          </Text>
                        </View>
                      </Pressable>

                      <Pressable
                        style={({ pressed }) => [
                          styles.renameButton,
                          pressed && styles.xpButtonPressed,
                        ]}
                        onPress={() => openRenameModal(user)}
                      >
                        <Text style={styles.renameButtonText}>Přejmenovat</Text>
                      </Pressable>
                    </View>
                  ))
                )}
              </ScrollView>
            </View>

            {lastActionText ? (
              <View style={styles.actionBox}>
                <Text style={styles.actionText}>{lastActionText}</Text>
              </View>
            ) : null}

            <View style={styles.bottomButtons}>
              <Pressable
                style={({ pressed }) => [
                  styles.bottomButton,
                  pressed && styles.xpButtonPressed,
                ]}
                onPress={openChangeModal}
              >
                <Text style={styles.bottomButtonText}>Zmena</Text>
              </Pressable>

              <Pressable
                style={({ pressed }) => [
                  styles.bottomButton,
                  pressed && styles.xpButtonPressed,
                ]}
                onPress={openSettings}
              >
                <Text style={styles.bottomButtonText}>nastaveni</Text>
              </Pressable>
            </View>
          </View>

          <View style={styles.statusBar}>
            <Text style={styles.statusText}>Připojeno jako admin</Text>
            <Text style={styles.statusText}>
              Status: {isAdminOnline ? 'online' : 'offline'}
            </Text>
          </View>
        </View>

        <Modal
          visible={renameModalVisible}
          transparent
          animationType="fade"
          onRequestClose={closeRenameModal}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalWindow}>
              <View style={styles.modalTitleBar}>
                <Text style={styles.modalTitleText}>Přejmenovat uživatele</Text>

                <Pressable style={styles.modalCloseButton} onPress={closeRenameModal}>
                  <Text style={styles.modalCloseButtonText}>×</Text>
                </Pressable>
              </View>

              <View style={styles.modalBody}>
                <Text style={styles.modalLabel}>Nové jméno uživatele:</Text>

                <TextInput
                  value={newUserName}
                  onChangeText={setNewUserName}
                  style={styles.modalInput}
                  placeholder="Zadej nové jméno"
                  placeholderTextColor="#666666"
                  autoFocus
                  maxLength={30}
                  returnKeyType="done"
                  onSubmitEditing={saveRename}
                />

                <View style={styles.modalButtons}>
                  <Pressable
                    style={({ pressed }) => [
                      styles.modalButton,
                      pressed && styles.xpButtonPressed,
                    ]}
                    onPress={saveRename}
                  >
                    <Text style={styles.modalButtonText}>Uložit</Text>
                  </Pressable>

                  <Pressable
                    style={({ pressed }) => [
                      styles.modalButton,
                      pressed && styles.xpButtonPressed,
                    ]}
                    onPress={closeRenameModal}
                  >
                    <Text style={styles.modalButtonText}>Zrušit</Text>
                  </Pressable>
                </View>
              </View>
            </View>
          </View>
        </Modal>

        <Modal
          visible={changeModalVisible}
          transparent
          animationType="fade"
          onRequestClose={closeChangeModal}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalWindow}>
              <View style={styles.modalTitleBar}>
                <Text style={styles.modalTitleText}>Zmena roomky</Text>

                <Pressable style={styles.modalCloseButton} onPress={closeChangeModal}>
                  <Text style={styles.modalCloseButtonText}>×</Text>
                </Pressable>
              </View>

              <View style={styles.modalBody}>
                <Text style={styles.modalLabel}>Nový PIN pro uživatele:</Text>

                <TextInput
                  value={newPin}
                  onChangeText={(value) => {
                    setChangeError('');
                    setNewPin(value.replace(/[^0-9]/g, '').slice(0, 4));
                  }}
                  style={styles.modalInput}
                  placeholder="Např. 4582"
                  placeholderTextColor="#666666"
                  autoFocus
                  maxLength={4}
                  keyboardType="number-pad"
                  inputMode="numeric"
                />

                <View style={styles.warningBox}>
                  <Text style={styles.warningText}>
                    Po uložení budou všichni uživatelé vykopnuti z roomky.
                  </Text>
                </View>

                {changeError ? (
                  <Text style={styles.errorText}>{changeError}</Text>
                ) : null}

                <View style={styles.modalButtons}>
                  <Pressable
                    style={({ pressed }) => [
                      styles.modalButton,
                      pressed && styles.xpButtonPressed,
                    ]}
                    onPress={saveChangeAndKickUsers}
                  >
                    <Text style={styles.modalButtonText}>Uložit</Text>
                  </Pressable>

                  <Pressable
                    style={({ pressed }) => [
                      styles.modalButton,
                      pressed && styles.xpButtonPressed,
                    ]}
                    onPress={closeChangeModal}
                  >
                    <Text style={styles.modalButtonText}>Zrušit</Text>
                  </Pressable>
                </View>
              </View>
            </View>
          </View>
        </Modal>

        <Modal
          visible={settingsModalVisible}
          transparent
          animationType="fade"
          onRequestClose={closeSettings}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalWindow}>
              <View style={styles.modalTitleBar}>
                <Text style={styles.modalTitleText}>nastaveni</Text>

                <Pressable style={styles.modalCloseButton} onPress={closeSettings}>
                  <Text style={styles.modalCloseButtonText}>×</Text>
                </Pressable>
              </View>

              {renderSettingsContent()}
            </View>
          </View>
        </Modal>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default AdminPin;

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#0058d8',
  },

  page: {
    flex: 1,
    backgroundColor: '#1f7a7a',
  },

  window: {
    flex: 1,
    backgroundColor: '#ece9d8',
    borderWidth: 3,
    borderTopColor: '#ffffff',
    borderLeftColor: '#ffffff',
    borderRightColor: '#003c9e',
    borderBottomColor: '#003c9e',
  },

  titleBar: {
    height: 38,
    backgroundColor: '#0058d8',
    borderBottomWidth: 2,
    borderBottomColor: '#003f9e',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingLeft: 8,
    paddingRight: 5,
  },

  titleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },

  windowsIcon: {
    width: 18,
    height: 18,
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginRight: 7,
  },

  winSquare: {
    width: 8,
    height: 8,
    margin: 0.5,
  },

  titleText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '900',
    flexShrink: 1,
    textShadowColor: '#00245c',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 1,
  },

  windowButtons: {
    flexDirection: 'row',
    marginLeft: 8,
  },

  windowButton: {
    width: 22,
    height: 22,
    marginLeft: 4,
    backgroundColor: '#d7e8ff',
    borderWidth: 1,
    borderTopColor: '#ffffff',
    borderLeftColor: '#ffffff',
    borderRightColor: '#174a9c',
    borderBottomColor: '#174a9c',
    alignItems: 'center',
    justifyContent: 'center',
  },

  closeButton: {
    backgroundColor: '#e04b31',
  },

  windowButtonText: {
    color: '#003c8f',
    fontSize: 13,
    fontWeight: '900',
    lineHeight: 15,
  },

  closeButtonText: {
    color: '#ffffff',
    fontSize: 18,
    lineHeight: 19,
  },

  body: {
    flex: 1,
    padding: 10,
  },

  topInfoPanel: {
    backgroundColor: '#d6d3c3',
    borderWidth: 2,
    borderTopColor: '#ffffff',
    borderLeftColor: '#ffffff',
    borderRightColor: '#777777',
    borderBottomColor: '#777777',
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginBottom: 10,
  },

  topInfoText: {
    color: '#000000',
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 3,
  },

  pinText: {
    color: '#003c9e',
    fontWeight: '900',
  },

  adminStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  adminStatusDot: {
    width: 11,
    height: 11,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#ffffff',
    marginRight: 6,
  },

  usersPanel: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderWidth: 2,
    borderTopColor: '#808080',
    borderLeftColor: '#808080',
    borderRightColor: '#ffffff',
    borderBottomColor: '#ffffff',
  },

  panelTitleBar: {
    minHeight: 34,
    backgroundColor: '#d6d3c3',
    borderBottomWidth: 1,
    borderBottomColor: '#aaa793',
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  panelTitleText: {
    color: '#000000',
    fontSize: 14,
    fontWeight: '900',
  },

  panelCountText: {
    color: '#003c9e',
    fontSize: 12,
    fontWeight: '900',
  },

  usersScroll: {
    flex: 1,
  },

  usersContent: {
    padding: 10,
    paddingBottom: 14,
    flexGrow: 1,
  },

  userRow: {
    width: '100%',
    minHeight: 66,
    backgroundColor: '#ece9d8',
    borderWidth: 2,
    borderTopColor: '#ffffff',
    borderLeftColor: '#ffffff',
    borderRightColor: '#777777',
    borderBottomColor: '#777777',
    marginBottom: 10,
    paddingVertical: 8,
    paddingHorizontal: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  userInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: 8,
  },

  userInfoPressed: {
    opacity: 0.7,
  },

  userIconBox: {
    width: 42,
    height: 42,
    borderWidth: 2,
    borderTopColor: '#ffffff',
    borderLeftColor: '#ffffff',
    borderRightColor: '#245aa8',
    borderBottomColor: '#245aa8',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },

  userIcon: {
    fontSize: 22,
  },

  userTextBox: {
    flex: 1,
  },

  userName: {
    color: '#000000',
    fontSize: 15,
    fontWeight: '900',
    marginBottom: 3,
  },

  mutedMinutesText: {
    color: '#d00000',
    fontSize: 15,
    fontWeight: '900',
  },

  userStatus: {
    color: '#333333',
    fontSize: 12,
  },

  renameButton: {
    minWidth: 112,
    height: 34,
    backgroundColor: '#ece9d8',
    borderWidth: 2,
    borderTopColor: '#ffffff',
    borderLeftColor: '#ffffff',
    borderRightColor: '#777777',
    borderBottomColor: '#777777',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },

  renameButtonText: {
    color: '#000000',
    fontSize: 12,
    fontWeight: '900',
  },

  emptyBox: {
    flex: 1,
    minHeight: 260,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },

  emptyIcon: {
    fontSize: 48,
    marginBottom: 12,
  },

  emptyTitle: {
    color: '#000000',
    fontSize: 20,
    fontWeight: '900',
    textAlign: 'center',
    marginBottom: 8,
  },

  emptyText: {
    color: '#333333',
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  },

  actionBox: {
    backgroundColor: '#fff8d7',
    borderWidth: 1,
    borderColor: '#b9a85c',
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginTop: 10,
  },

  actionText: {
    color: '#3a3200',
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
  },

  bottomButtons: {
    paddingTop: 10,
    flexDirection: 'row',
  },

  bottomButton: {
    flex: 1,
    height: 42,
    backgroundColor: '#ece9d8',
    borderWidth: 2,
    borderTopColor: '#ffffff',
    borderLeftColor: '#ffffff',
    borderRightColor: '#777777',
    borderBottomColor: '#777777',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 4,
  },

  bottomButtonText: {
    color: '#000000',
    fontSize: 14,
    fontWeight: '900',
  },

  xpButtonPressed: {
    borderTopColor: '#777777',
    borderLeftColor: '#777777',
    borderRightColor: '#ffffff',
    borderBottomColor: '#ffffff',
    backgroundColor: '#d8d5c6',
  },

  statusBar: {
    height: 25,
    backgroundColor: '#d6d3c3',
    borderTopWidth: 1,
    borderTopColor: '#aaa793',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 8,
  },

  statusText: {
    color: '#333333',
    fontSize: 11,
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 18,
  },

  modalWindow: {
    width: '100%',
    maxWidth: 410,
    maxHeight: '86%',
    backgroundColor: '#ece9d8',
    borderWidth: 3,
    borderTopColor: '#ffffff',
    borderLeftColor: '#ffffff',
    borderRightColor: '#003c9e',
    borderBottomColor: '#003c9e',
  },

  modalTitleBar: {
    height: 34,
    backgroundColor: '#0058d8',
    borderBottomWidth: 2,
    borderBottomColor: '#003f9e',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingLeft: 8,
    paddingRight: 5,
  },

  modalTitleText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '900',
  },

  modalCloseButton: {
    width: 22,
    height: 22,
    backgroundColor: '#e04b31',
    borderWidth: 1,
    borderTopColor: '#ffffff',
    borderLeftColor: '#ffffff',
    borderRightColor: '#8f1d10',
    borderBottomColor: '#8f1d10',
    alignItems: 'center',
    justifyContent: 'center',
  },

  modalCloseButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '900',
    lineHeight: 19,
  },

  modalBody: {
    padding: 16,
  },

  modalLabel: {
    color: '#000000',
    fontSize: 13,
    fontWeight: '900',
    marginBottom: 10,
  },

  modalInput: {
    height: 42,
    backgroundColor: '#ffffff',
    color: '#000000',
    fontSize: 14,
    paddingHorizontal: 10,
    borderWidth: 2,
    borderTopColor: '#6e6e6e',
    borderLeftColor: '#6e6e6e',
    borderRightColor: '#ffffff',
    borderBottomColor: '#ffffff',
    marginBottom: 12,
  },

  warningBox: {
    backgroundColor: '#fff8d7',
    borderWidth: 1,
    borderColor: '#b9a85c',
    padding: 8,
    marginBottom: 10,
  },

  warningText: {
    color: '#3a3200',
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
  },

  errorText: {
    color: '#b00000',
    fontSize: 12,
    fontWeight: '900',
    marginBottom: 10,
    textAlign: 'center',
  },

  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 8,
  },

  modalButton: {
    minWidth: 88,
    height: 36,
    backgroundColor: '#ece9d8',
    borderWidth: 2,
    borderTopColor: '#ffffff',
    borderLeftColor: '#ffffff',
    borderRightColor: '#777777',
    borderBottomColor: '#777777',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    marginLeft: 10,
  },

  modalButtonText: {
    color: '#000000',
    fontSize: 13,
    fontWeight: '900',
  },

  statusOption: {
    backgroundColor: '#ece9d8',
    borderWidth: 3,
    paddingVertical: 12,
    paddingHorizontal: 10,
    marginBottom: 10,
  },

  statusOptionOn: {
    borderColor: '#28c840',
  },

  statusOptionOff: {
    borderColor: '#ff3b30',
  },

  statusOptionTop: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },

  statusDot: {
    width: 13,
    height: 13,
    borderRadius: 7,
    borderWidth: 1,
    borderColor: '#ffffff',
    marginRight: 8,
  },

  statusDotOn: {
    backgroundColor: '#28c840',
  },

  statusDotOff: {
    backgroundColor: '#ff3b30',
  },

  statusOptionTitle: {
    color: '#000000',
    fontSize: 15,
    fontWeight: '900',
  },

  statusOptionText: {
    color: '#333333',
    fontSize: 12,
    lineHeight: 17,
  },

  settingsOption: {
    backgroundColor: '#ece9d8',
    borderWidth: 2,
    borderTopColor: '#ffffff',
    borderLeftColor: '#ffffff',
    borderRightColor: '#777777',
    borderBottomColor: '#777777',
    paddingVertical: 12,
    paddingHorizontal: 10,
    marginBottom: 10,
  },

  settingsOptionTitle: {
    color: '#000000',
    fontSize: 15,
    fontWeight: '900',
    marginBottom: 4,
  },

  settingsOptionText: {
    color: '#333333',
    fontSize: 12,
    lineHeight: 17,
  },

  settingsList: {
    maxHeight: 360,
  },

  settingsUserRow: {
    minHeight: 58,
    backgroundColor: '#ece9d8',
    borderWidth: 2,
    borderTopColor: '#ffffff',
    borderLeftColor: '#ffffff',
    borderRightColor: '#777777',
    borderBottomColor: '#777777',
    padding: 8,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },

  smallUserIconBox: {
    width: 38,
    height: 38,
    borderWidth: 2,
    borderTopColor: '#ffffff',
    borderLeftColor: '#ffffff',
    borderRightColor: '#245aa8',
    borderBottomColor: '#245aa8',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },

  smallUserIcon: {
    fontSize: 20,
  },

  settingsUserTextBox: {
    flex: 1,
  },

  settingsUserName: {
    color: '#000000',
    fontSize: 14,
    fontWeight: '900',
  },

  settingsUserSubText: {
    color: '#333333',
    fontSize: 12,
    marginTop: 2,
  },

  smallEmptyBox: {
    backgroundColor: '#ffffff',
    borderWidth: 2,
    borderTopColor: '#808080',
    borderLeftColor: '#808080',
    borderRightColor: '#ffffff',
    borderBottomColor: '#ffffff',
    padding: 14,
    marginBottom: 10,
  },

  smallEmptyText: {
    color: '#333333',
    fontSize: 13,
    textAlign: 'center',
    fontWeight: '700',
  },

  confirmIcon: {
    fontSize: 42,
    textAlign: 'center',
    marginBottom: 8,
  },

  confirmTitle: {
    color: '#000000',
    fontSize: 17,
    fontWeight: '900',
    textAlign: 'center',
    marginBottom: 8,
  },

  confirmUserName: {
    color: '#003c9e',
    fontSize: 18,
    fontWeight: '900',
    textAlign: 'center',
    marginBottom: 12,
  },

  selectedUserText: {
    color: '#003c9e',
    fontSize: 17,
    fontWeight: '900',
    marginBottom: 12,
  },

  colourGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },

  colourButton: {
    width: '48%',
    minHeight: 46,
    backgroundColor: '#ece9d8',
    borderWidth: 2,
    borderTopColor: '#ffffff',
    borderLeftColor: '#ffffff',
    borderRightColor: '#777777',
    borderBottomColor: '#777777',
    marginBottom: 10,
    paddingHorizontal: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },

  colourPreview: {
    width: 24,
    height: 24,
    borderWidth: 1,
    borderColor: '#000000',
    marginRight: 8,
  },

  colourButtonText: {
    color: '#000000',
    fontSize: 12,
    fontWeight: '900',
    flexShrink: 1,
  },
});