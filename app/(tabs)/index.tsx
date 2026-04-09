import ListHeading from "@/components/ListHeading";
import SubscriptionCard from "@/components/SubscriptionCard";
import UpcomingSubscriptionCard from "@/components/UpcomingSubscriptionCard";
import { HOME_BALANCE, HOME_SUBSCRIPTIONS, HOME_USER, UPCOMING_SUBSCRIPTIONS } from "@/constants/data";
import { icons } from "@/constants/icons";
import images from "@/constants/images";
import "@/global.css";
import { formatCurrency } from "@/lib/utils";
import dayjs from "dayjs";
import { styled } from "nativewind";
import { useState } from "react";
import { FlatList, Image, Text, View } from "react-native";
import { SafeAreaView as RNSafeAreaView } from "react-native-safe-area-context";
const SafeAreaView = styled(RNSafeAreaView);

export default function App() {
  const [expandedSubscriptionId, setExpandedSubscriptionId] = useState<string | null>(null);
  const onCardPressed = (id: string) => {
    setExpandedSubscriptionId((prevId) => (prevId === id ? null : id));
  };
  return (
    <SafeAreaView className="flex-1 bg-background p-5">
        <FlatList
              ListHeaderComponent={()=> (
          <>
            <View className="home-header">
            <View className="home-user">
              <Image source={images.avatar} className="home-avatar"/>
              <Text className="home-user-name">{HOME_USER.name}</Text>
            </View>
            <Image source={icons.add} className="home-add-icon"/>
          </View>    

          <View className="home-balance-card">
            <Text className="home-balance-label">Balance</Text>
            <View className="home-balance-row">
              <Text className="home-balance-amount">{formatCurrency(HOME_BALANCE.amount)}</Text>
              <Text className="home-balance-date">{dayjs(HOME_BALANCE.nextRenewalDate).format('MMM DD, YYYY')}</Text>
            </View>
          </View>  
          <View className="mb-5">
            <ListHeading title="Upcoming" buttonText="View All"/>
            <FlatList 
              data={UPCOMING_SUBSCRIPTIONS}
              renderItem={({item})=>(
                  <UpcomingSubscriptionCard {...item}/>
              )}
              keyExtractor={(item)=>item.id}
              horizontal={true}
              showsHorizontalScrollIndicator={false}
              ListEmptyComponent={<Text className="home-empty-state">No upcoming subscriptions</Text>}
              />
          </View>
           <ListHeading title="All Subscriptions" buttonText="View All"/>
          </>
        )}
        data={HOME_SUBSCRIPTIONS}
        renderItem={({item})=>(
          <SubscriptionCard
         {...item}
         expanded = {expandedSubscriptionId === item.id}
         onPress={() => onCardPressed(item.id)}
        
        />
        )}
        extraData={expandedSubscriptionId}
        ItemSeparatorComponent={()=> <View className="h-4"/>}
        keyExtractor={(item)=>item.id}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={<Text className="home-empty-state">No subscriptions</Text>}
        contentContainerClassName="pb-20"
        />
    </SafeAreaView>
      
  );
}