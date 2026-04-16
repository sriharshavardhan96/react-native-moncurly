import { icons } from "@/constants/icons";
import { clsx } from "clsx";
import dayjs from "dayjs";
import React, { useState } from "react";
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";

type Frequency = "Monthly" | "Yearly";
type Category =
  | "Entertainment"
  | "AI Tools"
  | "Developer Tools"
  | "Design"
  | "Productivity"
  | "Cloud"
  | "Music"
  | "Other";

type CreateSubscriptionModalProps = {
  visible: boolean;
  onClose: () => void;
  onCreate: (subscription: Subscription) => void;
};

const frequencies: Frequency[] = ["Monthly", "Yearly"];
const categories: Category[] = [
  "Entertainment",
  "AI Tools",
  "Developer Tools",
  "Design",
  "Productivity",
  "Cloud",
  "Music",
  "Other",
];

const categoryColors: Record<Category, string> = {
  Entertainment: "#f7c8d0",
  "AI Tools": "#b8d4e3",
  "Developer Tools": "#e8def8",
  Design: "#f5c542",
  Productivity: "#d9e8b8",
  Cloud: "#c7ddff",
  Music: "#b8e8d0",
  Other: "#f6eecf",
};

const CreateSubscriptionModal = ({
  visible,
  onClose,
  onCreate,
}: CreateSubscriptionModalProps) => {
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [frequency, setFrequency] = useState<Frequency>("Monthly");
  const [category, setCategory] = useState<Category>("Entertainment");
  const [errors, setErrors] = useState<{ name?: string; price?: string }>({});

  const resetForm = () => {
    setName("");
    setPrice("");
    setFrequency("Monthly");
    setCategory("Entertainment");
    setErrors({});
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSubmit = () => {
    const trimmedName = name.trim();
    const parsedPrice = Number.parseFloat(price);
    const nextErrors: { name?: string; price?: string } = {};

    if (!trimmedName) {
      nextErrors.name = "Enter a subscription name.";
    }

    if (!Number.isFinite(parsedPrice) || parsedPrice <= 0) {
      nextErrors.price = "Enter a positive price.";
    }

    setErrors(nextErrors);

    if (nextErrors.name || nextErrors.price) return;

    const startDate = dayjs();
    const renewalDate =
      frequency === "Monthly" ? startDate.add(1, "month") : startDate.add(1, "year");

    onCreate({
      id: `${trimmedName.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${Date.now()}`,
      name: trimmedName,
      price: parsedPrice,
      currency: "USD",
      frequency,
      category,
      status: "active",
      startDate: startDate.toISOString(),
      renewalDate: renewalDate.toISOString(),
      icon: icons.wallet,
      billing: frequency,
      color: categoryColors[category],
    });

    resetForm();
    onClose();
  };

  const isSubmitDisabled = !name.trim() || !price.trim();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        className="modal-overlay"
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <Pressable className="flex-1" onPress={handleClose} />

        <View className="modal-container">
          <View className="modal-header">
            <Text className="modal-title">New Subscription</Text>
            <Pressable className="modal-close" onPress={handleClose}>
              <Text className="modal-close-text">×</Text>
            </Pressable>
          </View>

          <ScrollView
            className="modal-body"
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View className="auth-field">
              <Text className="auth-label">Name</Text>
              <TextInput
                className={clsx("auth-input", errors.name && "auth-input-error")}
                value={name}
                placeholder="Netflix, Figma, ChatGPT..."
                placeholderTextColor="rgba(8, 17, 38, 0.42)"
                autoCapitalize="words"
                onChangeText={setName}
              />
              {errors.name ? <Text className="auth-error">{errors.name}</Text> : null}
            </View>

            <View className="auth-field">
              <Text className="auth-label">Price</Text>
              <TextInput
                className={clsx("auth-input", errors.price && "auth-input-error")}
                value={price}
                placeholder="12.99"
                placeholderTextColor="rgba(8, 17, 38, 0.42)"
                keyboardType="decimal-pad"
                onChangeText={setPrice}
              />
              {errors.price ? <Text className="auth-error">{errors.price}</Text> : null}
            </View>

            <View className="auth-field">
              <Text className="auth-label">Frequency</Text>
              <View className="picker-row">
                {frequencies.map((item) => {
                  const isActive = item === frequency;

                  return (
                    <Pressable
                      key={item}
                      className={clsx("picker-option", isActive && "picker-option-active")}
                      onPress={() => setFrequency(item)}
                    >
                      <Text
                        className={clsx(
                          "picker-option-text",
                          isActive && "picker-option-text-active"
                        )}
                      >
                        {item}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            <View className="auth-field">
              <Text className="auth-label">Category</Text>
              <View className="category-scroll">
                {categories.map((item) => {
                  const isActive = item === category;

                  return (
                    <Pressable
                      key={item}
                      className={clsx("category-chip", isActive && "category-chip-active")}
                      onPress={() => setCategory(item)}
                    >
                      <Text
                        className={clsx(
                          "category-chip-text",
                          isActive && "category-chip-text-active"
                        )}
                      >
                        {item}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            <Pressable
              className={clsx("auth-button", isSubmitDisabled && "auth-button-disabled")}
              disabled={isSubmitDisabled}
              onPress={handleSubmit}
            >
              <Text className="auth-button-text">Create subscription</Text>
            </Pressable>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

export default CreateSubscriptionModal;
