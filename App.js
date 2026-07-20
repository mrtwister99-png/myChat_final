import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import PinEntry from './src/screens/PinEntry';
import UzivatelPin from './src/screens/UzivatelPin';
import AdminPin from './src/screens/AdminPin';
import AdminChat from './src/screens/AdminChat';

const Stack = createNativeStackNavigator();

const App = () => {
  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="PinEntry"
        screenOptions={{ headerShown: false }}
      >
        <Stack.Screen name="PinEntry" component={PinEntry} />
        <Stack.Screen name="UzivatelPin" component={UzivatelPin} />
        <Stack.Screen name="AdminPin" component={AdminPin} />
        <Stack.Screen name="AdminChat" component={AdminChat} /> 
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default App;
