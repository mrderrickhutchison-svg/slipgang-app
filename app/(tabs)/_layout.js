import { Tabs } from 'expo-router';
import { View, Text, StyleSheet } from 'react-native';
import { Bone, Dog, PlusCircle, PawPrint, Settings } from 'lucide-react-native';

const ACTIVE_COLOR = '#F5A623';
const INACTIVE_COLOR = '#8B95A5';
const ICON_SIZE = 26;

function TabIcon({ Icon, label, focused }) {
  const color = focused ? ACTIVE_COLOR : INACTIVE_COLOR;
  return (
    <View style={styles.tabItem}>
      <Icon color={color} size={ICON_SIZE} />
      <Text style={[styles.tabLabel, focused && styles.tabLabelActive]} numberOfLines={1}>{label}</Text>
    </View>
  );
}

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarShowLabel: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Feed',
          tabBarIcon: ({ focused }) => <TabIcon Icon={Bone} label="Feed" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="mybets"
        options={{
          title: 'My Bets',
          tabBarIcon: ({ focused }) => <TabIcon Icon={Dog} label="My Bets" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="add"
        options={{
          title: 'Add Bet',
          tabBarIcon: ({ focused }) => <TabIcon Icon={PlusCircle} label="Add" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="gang"
        options={{
          title: 'Gang',
          tabBarIcon: ({ focused }) => <TabIcon Icon={PawPrint} label="Gang" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ focused }) => <TabIcon Icon={Settings} label="Settings" focused={focused} />,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: '#0F1218',
    borderTopColor: 'rgba(255,255,255,0.06)',
    borderTopWidth: 1,
    height: 85,
    paddingTop: 8,
  },
  tabItem: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 72,
  },
  tabLabel: {
    fontSize: 9,
    color: '#8B95A5',
    fontWeight: '600',
    marginTop: 3,
  },
  tabLabelActive: {
    color: '#F5A623',
  },
});
