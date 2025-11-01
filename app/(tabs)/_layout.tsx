import { Tabs } from 'expo-router';
import { Skull, Trophy } from 'lucide-react-native';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#1a0000',
          borderTopColor: '#660000',
        },
        tabBarActiveTintColor: '#ff0000',
        tabBarInactiveTintColor: '#666666',
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Play',
          tabBarIcon: ({ size, color }) => (
            <Skull size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="leaderboard"
        options={{
          title: 'Leaderboard',
          tabBarIcon: ({ size, color }) => (
            <Trophy size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
