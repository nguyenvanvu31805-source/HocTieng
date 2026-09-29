import { Tabs } from 'expo-router';
import React from 'react';
import { Image, Platform } from 'react-native';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#4255FF',
        tabBarInactiveTintColor: '#60646C',
        tabBarStyle: {
          backgroundColor: '#ffffff',
          borderTopColor: '#E0E1E6',
        },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Trang chủ',
          tabBarLabel: 'Trang chủ',
          tabBarIcon: ({ color, size }) => (
            <Image
              source={require('@/assets/images/tabIcons/home.png')}
              style={{ width: size || 24, height: size || 24, tintColor: color }}
              resizeMode="contain"
            />
          ),
        }}
      />
      <Tabs.Screen
        name="library"
        options={{
          title: 'Thư viện',
          tabBarLabel: 'Thư viện',
          tabBarIcon: ({ color, size }) => (
            <Image
              source={require('@/assets/images/tabIcons/explore.png')}
              style={{ width: size || 24, height: size || 24, tintColor: color }}
              resizeMode="contain"
            />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Hồ sơ',
          tabBarLabel: 'Hồ sơ',
          tabBarIcon: ({ color, size }) => (
            <Image
              source={require('@/assets/images/tabIcons/home.png')}
              style={{ width: size || 24, height: size || 24, tintColor: color }}
              resizeMode="contain"
            />
          ),
        }}
      />
    </Tabs>
  );
}
