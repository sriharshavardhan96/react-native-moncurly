import SubscriptionCard from "@/components/SubscriptionCard";
import { useSubscriptions } from "@/lib/subscriptionStore";
import { styled } from "nativewind";
import React, { useMemo, useState } from 'react';
import { FlatList, KeyboardAvoidingView, Platform, Text, TextInput, View } from 'react-native';
import { SafeAreaView as RNSafeAreaView } from "react-native-safe-area-context";

const SafeAreaView = styled(RNSafeAreaView);

const Subscriptions = () => {
  const [query, setQuery] = useState('');
  const [expandedSubscriptionId, setExpandedSubscriptionId] = useState<string | null>(null);
  const subscriptions = useSubscriptions();

  const normalizedQuery = query.trim().toLowerCase();
  const filteredSubscriptions = useMemo(() => {
    if (!normalizedQuery) return subscriptions;

    return subscriptions.filter((subscription) => {
      const searchableText = [
        subscription.name,
        subscription.plan,
        subscription.category,
        subscription.billing,
        subscription.status,
        subscription.paymentMethod,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return searchableText.includes(normalizedQuery);
    });
  }, [normalizedQuery, subscriptions]);

  const handleCardPress = (id: string) => {
    setExpandedSubscriptionId((currentId) => (currentId === id ? null : id));
  };

  return (
    <SafeAreaView className="flex-1 bg-background p-5">
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <FlatList
          data={filteredSubscriptions}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <SubscriptionCard
              {...item}
              expanded={expandedSubscriptionId === item.id}
              onPress={() => handleCardPress(item.id)}
            />
          )}
          ListHeaderComponent={(
            <View className="mb-5 gap-4">
              <View>
                <Text className="text-3xl font-sans-bold text-primary">Subscriptions</Text>
                <Text className="mt-2 text-base font-sans-medium text-muted-foreground">
                  Search across your saved plans, tools, and billing details.
                </Text>
              </View>

              <TextInput
                className="auth-input"
                value={query}
                placeholder="Search subscriptions"
                placeholderTextColor="rgba(8, 17, 38, 0.42)"
                autoCapitalize="none"
                autoCorrect={false}
                onChangeText={setQuery}
              />

              <Text className="text-sm font-sans-semibold text-muted-foreground">
                {filteredSubscriptions.length} of {subscriptions.length} subscriptions
              </Text>
            </View>
          )}
          ListEmptyComponent={(
            <View className="rounded-3xl border border-border bg-card p-5">
              <Text className="text-lg font-sans-bold text-primary">No matches found</Text>
              <Text className="mt-2 text-sm font-sans-medium text-muted-foreground">
                Try searching by app name, category, billing cycle, or payment method.
              </Text>
            </View>
          )}
          ItemSeparatorComponent={() => <View className="h-4" />}
          keyboardDismissMode="on-drag"
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerClassName="pb-32"
          extraData={expandedSubscriptionId}
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

export default Subscriptions;
