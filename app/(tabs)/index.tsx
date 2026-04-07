import "@/global.css";
import { Link } from "expo-router";
import { styled } from "nativewind";
import { Text } from "react-native";
import { SafeAreaView as RNSafeAreaView } from "react-native-safe-area-context";
const SafeAreaView = styled(RNSafeAreaView);

export default function App() {
  return (
    <SafeAreaView className="flex-1 bg-background p-5">
          <Text className="text-xl font-bold text-success">
            Welcome to Nativewind!
          </Text>
          <Link href="/(auth)/sign-in" className="mt-4 rounded bg-primary p-4 text-white">Sign In</Link>
          <Link href="/(auth)/sign-up" className="mt-4 rounded bg-primary p-4 text-white">Sign Up</Link>
          <Link href={{
            pathname: "/subscriptions/[id]",
            params: {id: 'claude-max'},
          }} 
          className="mt-4 rounded bg-primary p-4 text-white">
            Claude Max Subscription
          </Link>
    </SafeAreaView>
      
  );
}