import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  BackHandler,
  Image,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQueryClient } from "@tanstack/react-query";
import {
  useGetProfile,
  useUpsertProfile,
  useListContacts,
  useCreateContact,
  useUpdateContact,
  useDeleteContact,
  getGetProfileQueryKey,
  getListContactsQueryKey,
} from "@workspace/api-client-react";
import { useAuth } from "@/context/AuthContext";
import { useColors } from "@/hooks/useColors";

const GENDER_OPTIONS = ["Male", "Female", "Other", "Prefer not to say"];
const BLOOD_GROUP_OPTIONS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-", "Unknown"];
const RELATIONSHIP_OPTIONS = ["Mother", "Father", "Brother", "Sister", "Spouse", "Friend", "Doctor", "Other"];
const PRIORITY_OPTIONS = ["Primary", "Secondary", "Doctor", "Other"];

interface ContactForm {
  name: string;
  relationship: string;
  phone: string;
  priority: string;
}

interface Snapshot {
  profileImage: string;
  dob: string;
  gender: string;
  bloodGroup: string;
  address: string;
  allergies: string;
  medicalConditions: string;
  medications: string;
}

function SectionCard({ title, children, colors }: { title: string; children: React.ReactNode; colors: any }) {
  return (
    <View style={{ backgroundColor: colors.card, borderRadius: colors.radius, borderWidth: 1, borderColor: colors.border, padding: 16, marginBottom: 14 }}>
      <Text style={{ fontSize: 12, fontFamily: "Inter_600SemiBold", color: colors.mutedForeground, letterSpacing: 1.4, textTransform: "uppercase", marginBottom: 14 }}>{title}</Text>
      {children}
    </View>
  );
}

function FieldLabel({ label, colors }: { label: string; colors: any }) {
  return <Text style={{ fontSize: 11, fontFamily: "Inter_500Medium", color: colors.mutedForeground, marginBottom: 4, letterSpacing: 0.5 }}>{label}</Text>;
}

function InputField({ value, onChangeText, placeholder, multiline, colors }: { value: string; onChangeText: (t: string) => void; placeholder?: string; multiline?: boolean; colors: any }) {
  return (
    <TextInput
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder ?? ""}
      placeholderTextColor={colors.mutedForeground}
      multiline={multiline}
      style={{
        backgroundColor: colors.secondary,
        borderRadius: 10,
        paddingHorizontal: 12,
        paddingVertical: 10,
        color: colors.foreground,
        fontFamily: "Inter_400Regular",
        fontSize: 14,
        borderWidth: 1,
        borderColor: colors.border,
        marginBottom: 12,
        ...(multiline ? { minHeight: 72, textAlignVertical: "top" } : {}),
      }}
    />
  );
}

function ReadOnlyField({ value, placeholder, multiline, colors }: { value: string; placeholder?: string; multiline?: boolean; colors: any }) {
  return (
    <View style={{
      backgroundColor: colors.secondary,
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 11,
      borderWidth: 1,
      borderColor: colors.border,
      marginBottom: 12,
      ...(multiline ? { minHeight: 72 } : {}),
    }}>
      <Text style={{ fontFamily: "Inter_400Regular", fontSize: 14, color: value ? colors.foreground : colors.mutedForeground }}>
        {value || placeholder || "—"}
      </Text>
    </View>
  );
}

function PickerRow({ label, value, onPress, colors }: { label: string; value: string; onPress: () => void; colors: any }) {
  return (
    <Pressable onPress={onPress} style={{ backgroundColor: colors.secondary, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 11, flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderWidth: 1, borderColor: colors.border, marginBottom: 12 }}>
      <Text style={{ fontFamily: "Inter_400Regular", fontSize: 14, color: value ? colors.foreground : colors.mutedForeground }}>{value || label}</Text>
      <Feather name="chevron-down" size={16} color={colors.mutedForeground} />
    </Pressable>
  );
}

function OptionPickerModal({ visible, title, options, selected, onSelect, onClose, colors }: { visible: boolean; title: string; options: string[]; selected: string; onSelect: (v: string) => void; onClose: () => void; colors: any }) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.7)", justifyContent: "flex-end" }} onPress={onClose}>
        <View style={{ backgroundColor: colors.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 36, borderTopWidth: 1, borderColor: colors.border }}>
          <Text style={{ fontSize: 16, fontFamily: "Inter_700Bold", color: colors.foreground, marginBottom: 16, textAlign: "center" }}>{title}</Text>
          {options.map((opt) => (
            <Pressable key={opt} onPress={() => { onSelect(opt); onClose(); }} style={{ paddingVertical: 13, paddingHorizontal: 16, borderRadius: 12, marginBottom: 4, backgroundColor: selected === opt ? colors.glassTint : "transparent", flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              <Text style={{ fontFamily: "Inter_500Medium", fontSize: 15, color: selected === opt ? colors.primary : colors.foreground }}>{opt}</Text>
              {selected === opt && <Feather name="check" size={18} color={colors.primary} />}
            </Pressable>
          ))}
        </View>
      </Pressable>
    </Modal>
  );
}

export default function ProfileScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const navigation = useNavigation();
  const { user } = useAuth();

  const { data: profileData, isLoading: profileLoading } = useGetProfile();
  const { data: contactsData, isLoading: contactsLoading } = useListContacts();
  const contacts = contactsData?.contacts ?? [];

  const [isEditing, setIsEditing] = useState(false);
  const [snapshot, setSnapshot] = useState<Snapshot>({ profileImage: "", dob: "", gender: "", bloodGroup: "", address: "", allergies: "", medicalConditions: "", medications: "" });
  const [saveSuccess, setSaveSuccess] = useState(false);
  const saveSuccessTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { mutate: upsertProfile, isPending: saving } = useUpsertProfile({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetProfileQueryKey() });
        setIsEditing(false);
        setSaveSuccess(true);
        if (saveSuccessTimer.current) clearTimeout(saveSuccessTimer.current);
        saveSuccessTimer.current = setTimeout(() => setSaveSuccess(false), 3000);
      },
      onError: () => Alert.alert("Error", "Failed to save profile. Please try again."),
    },
  });
  const { mutate: createContact } = useCreateContact({
    mutation: { onSuccess: () => queryClient.invalidateQueries({ queryKey: getListContactsQueryKey() }) },
  });
  const { mutate: updateContact } = useUpdateContact({
    mutation: { onSuccess: () => queryClient.invalidateQueries({ queryKey: getListContactsQueryKey() }) },
  });
  const { mutate: deleteContact } = useDeleteContact({
    mutation: { onSuccess: () => queryClient.invalidateQueries({ queryKey: getListContactsQueryKey() }) },
  });

  const [profileImage, setProfileImage] = useState<string>("");
  const [dob, setDob] = useState("");
  const [gender, setGender] = useState("");
  const [bloodGroup, setBloodGroup] = useState("");
  const [address, setAddress] = useState("");
  const [allergies, setAllergies] = useState("");
  const [medicalConditions, setMedicalConditions] = useState("");
  const [medications, setMedications] = useState("");

  const [genderPickerVisible, setGenderPickerVisible] = useState(false);
  const [bloodGroupPickerVisible, setBloodGroupPickerVisible] = useState(false);

  const [contactModalVisible, setContactModalVisible] = useState(false);
  const [editingContactId, setEditingContactId] = useState<number | null>(null);
  const [contactForm, setContactForm] = useState<ContactForm>({ name: "", relationship: "", phone: "", priority: "Primary" });
  const [relPickerVisible, setRelPickerVisible] = useState(false);
  const [priPickerVisible, setPriPickerVisible] = useState(false);

  useEffect(() => {
    if (profileData && "id" in profileData) {
      const p = profileData as any;
      setProfileImage(p.profileImage ?? "");
      setDob(p.dob ?? "");
      setGender(p.gender ?? "");
      setBloodGroup(p.bloodGroup ?? "");
      setAddress(p.address ?? "");
      setAllergies(p.allergies ?? "");
      setMedicalConditions(p.medicalConditions ?? "");
      setMedications(p.medications ?? "");
    }
  }, [profileData]);

  const isDirty = useMemo(() => {
    if (!isEditing) return false;
    return (
      profileImage !== snapshot.profileImage ||
      dob !== snapshot.dob ||
      gender !== snapshot.gender ||
      bloodGroup !== snapshot.bloodGroup ||
      address !== snapshot.address ||
      allergies !== snapshot.allergies ||
      medicalConditions !== snapshot.medicalConditions ||
      medications !== snapshot.medications
    );
  }, [isEditing, profileImage, dob, gender, bloodGroup, address, allergies, medicalConditions, medications, snapshot]);

  function showUnsavedDialog(onDiscard?: () => void) {
    Alert.alert(
      "Unsaved Changes",
      "Unsaved changes detected. Discard changes?",
      [
        { text: "Continue Editing", style: "cancel" },
        {
          text: "Discard Changes",
          style: "destructive",
          onPress: () => {
            restoreSnapshot();
            onDiscard?.();
          },
        },
      ]
    );
  }

  function restoreSnapshot() {
    setProfileImage(snapshot.profileImage);
    setDob(snapshot.dob);
    setGender(snapshot.gender);
    setBloodGroup(snapshot.bloodGroup);
    setAddress(snapshot.address);
    setAllergies(snapshot.allergies);
    setMedicalConditions(snapshot.medicalConditions);
    setMedications(snapshot.medications);
    setIsEditing(false);
  }

  function handleStartEditing() {
    setSnapshot({ profileImage, dob, gender, bloodGroup, address, allergies, medicalConditions, medications });
    setIsEditing(true);
    setSaveSuccess(false);
  }

  function handleCancelEditing() {
    if (isDirty) {
      showUnsavedDialog();
    } else {
      setIsEditing(false);
    }
  }

  // Android back button guard
  useEffect(() => {
    if (!isEditing || !isDirty) return;
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      showUnsavedDialog();
      return true;
    });
    return () => sub.remove();
  }, [isEditing, isDirty]);

  // Tab press guard (intercepts tab navigation when dirty)
  useEffect(() => {
    if (!isEditing || !isDirty) return;
    const parent = navigation.getParent?.();
    const unsub = (parent as any)?.addListener?.("tabPress", (e: any) => {
      e.preventDefault();
      showUnsavedDialog();
    });
    return () => unsub?.();
  }, [navigation, isEditing, isDirty]);

  async function pickImage(source: "camera" | "gallery") {
    let result: ImagePicker.ImagePickerResult;
    const opts: ImagePicker.ImagePickerOptions = { mediaTypes: "images", allowsEditing: true, aspect: [1, 1], quality: 0.5, base64: true };
    if (source === "camera") {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (perm.status !== "granted") { Alert.alert("Permission needed", "Camera permission is required."); return; }
      result = await ImagePicker.launchCameraAsync(opts);
    } else {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (perm.status !== "granted") { Alert.alert("Permission needed", "Gallery permission is required."); return; }
      result = await ImagePicker.launchImageLibraryAsync(opts);
    }
    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      const uri = asset.base64 ? `data:image/jpeg;base64,${asset.base64}` : asset.uri;
      setProfileImage(uri);
    }
  }

  function showImagePicker() {
    if (Platform.OS === "web") { pickImage("gallery"); return; }
    Alert.alert("Profile Photo", "Choose a source", [
      { text: "Camera", onPress: () => pickImage("camera") },
      { text: "Gallery", onPress: () => pickImage("gallery") },
      { text: "Cancel", style: "cancel" },
    ]);
  }

  function handleSave() {
    upsertProfile({
      data: {
        profileImage: profileImage || null,
        dob: dob || null,
        gender: gender || null,
        bloodGroup: bloodGroup || null,
        address: address || null,
        allergies: allergies || null,
        medicalConditions: medicalConditions || null,
        medications: medications || null,
      },
    });
  }

  function openAddContact() {
    setEditingContactId(null);
    setContactForm({ name: "", relationship: "", phone: "", priority: "Primary" });
    setContactModalVisible(true);
  }

  function openEditContact(c: any) {
    setEditingContactId(c.id);
    setContactForm({ name: c.name, relationship: c.relationship, phone: c.phone, priority: c.priority });
    setContactModalVisible(true);
  }

  function handleSaveContact() {
    if (!contactForm.name || !contactForm.phone || !contactForm.relationship) {
      Alert.alert("Missing fields", "Name, phone and relationship are required.");
      return;
    }
    if (editingContactId !== null) {
      updateContact({ id: editingContactId, data: contactForm });
    } else {
      createContact({ data: contactForm });
    }
    setContactModalVisible(false);
  }

  function handleDeleteContact(id: number) {
    Alert.alert("Delete Contact", "Remove this emergency contact?", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => deleteContact({ id }) },
    ]);
  }

  const PRIORITY_COLOR: Record<string, string> = {
    Primary: "#e8003a",
    Secondary: "#ff9100",
    Doctor: "#00bcd4",
    Other: "#7878a0",
  };

  const isLoading = profileLoading || contactsLoading;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Header */}
      <View style={{ paddingTop: Platform.OS === "web" ? insets.top + 67 : insets.top + 16, paddingHorizontal: 20, paddingBottom: 12, flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
        <View>
          <Text style={{ fontSize: 26, fontFamily: "Inter_700Bold", color: colors.foreground }}>Profile</Text>
          <Text style={{ fontSize: 13, fontFamily: "Inter_400Regular", color: colors.mutedForeground, marginTop: 2 }}>Medical & Emergency Info</Text>
        </View>
        <View style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
          {/* Med ID button — always visible */}
          <Pressable
            onPress={() => router.push("/medical-id")}
            style={{ backgroundColor: colors.glassTint, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8, flexDirection: "row", alignItems: "center", gap: 6, borderWidth: 1, borderColor: "rgba(232,0,58,0.3)" }}
          >
            <MaterialCommunityIcons name="card-account-details" size={16} color={colors.primary} />
            <Text style={{ fontSize: 12, fontFamily: "Inter_600SemiBold", color: colors.primary }}>Med ID</Text>
          </Pressable>
          {/* Edit Profile button — only when not editing */}
          {!isEditing && (
            <Pressable
              onPress={handleStartEditing}
              style={{ backgroundColor: colors.secondary, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8, flexDirection: "row", alignItems: "center", gap: 6, borderWidth: 1, borderColor: colors.border }}
            >
              <Feather name="edit-2" size={14} color={colors.foreground} />
              <Text style={{ fontSize: 12, fontFamily: "Inter_600SemiBold", color: colors.foreground }}>Edit</Text>
            </Pressable>
          )}
        </View>
      </View>

      {/* Editing indicator bar */}
      {isEditing && (
        <View style={{ marginHorizontal: 20, marginBottom: 8, backgroundColor: "rgba(232,0,58,0.08)", borderRadius: 10, borderWidth: 1, borderColor: "rgba(232,0,58,0.25)", paddingHorizontal: 12, paddingVertical: 7, flexDirection: "row", alignItems: "center", gap: 8 }}>
          <Feather name="edit-3" size={13} color={colors.primary} />
          <Text style={{ flex: 1, fontSize: 12, fontFamily: "Inter_500Medium", color: colors.primary }}>Editing profile — tap Save Changes to apply.</Text>
        </View>
      )}

      {isLoading ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: Platform.OS === "web" ? 140 : 120 }}>

          {/* Profile Photo */}
          <SectionCard title="Profile Photo" colors={colors}>
            <View style={{ alignItems: "center" }}>
              {isEditing ? (
                <Pressable onPress={showImagePicker} style={{ position: "relative" }}>
                  {profileImage ? (
                    <Image source={{ uri: profileImage }} style={{ width: 96, height: 96, borderRadius: 48, borderWidth: 3, borderColor: colors.primary }} />
                  ) : (
                    <View style={{ width: 96, height: 96, borderRadius: 48, backgroundColor: colors.secondary, alignItems: "center", justifyContent: "center", borderWidth: 3, borderColor: colors.border }}>
                      <Feather name="user" size={40} color={colors.mutedForeground} />
                    </View>
                  )}
                  <View style={{ position: "absolute", bottom: 0, right: 0, width: 30, height: 30, borderRadius: 15, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: colors.background }}>
                    <Feather name="camera" size={14} color="#fff" />
                  </View>
                </Pressable>
              ) : (
                profileImage ? (
                  <Image source={{ uri: profileImage }} style={{ width: 96, height: 96, borderRadius: 48, borderWidth: 3, borderColor: colors.primary }} />
                ) : (
                  <View style={{ width: 96, height: 96, borderRadius: 48, backgroundColor: colors.secondary, alignItems: "center", justifyContent: "center", borderWidth: 3, borderColor: colors.border }}>
                    <Feather name="user" size={40} color={colors.mutedForeground} />
                  </View>
                )
              )}
              {isEditing && (
                <Text style={{ marginTop: 10, fontSize: 13, fontFamily: "Inter_400Regular", color: colors.mutedForeground }}>Tap to change photo</Text>
              )}
            </View>
          </SectionCard>

          {/* Personal Info */}
          <SectionCard title="Personal Information" colors={colors}>
            <FieldLabel label="FULL NAME" colors={colors} />
            <View style={{ backgroundColor: colors.secondary, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 11, marginBottom: 12, borderWidth: 1, borderColor: colors.border }}>
              <Text style={{ fontFamily: "Inter_400Regular", fontSize: 14, color: colors.mutedForeground }}>{user?.name ?? "—"}</Text>
            </View>

            <FieldLabel label="DATE OF BIRTH (YYYY-MM-DD)" colors={colors} />
            {isEditing ? (
              <InputField value={dob} onChangeText={setDob} placeholder="e.g. 1990-05-15" colors={colors} />
            ) : (
              <ReadOnlyField value={dob} placeholder="Not set" colors={colors} />
            )}

            <FieldLabel label="GENDER" colors={colors} />
            {isEditing ? (
              <PickerRow label="Select gender" value={gender} onPress={() => setGenderPickerVisible(true)} colors={colors} />
            ) : (
              <ReadOnlyField value={gender} placeholder="Not set" colors={colors} />
            )}

            <FieldLabel label="BLOOD GROUP" colors={colors} />
            {isEditing ? (
              <PickerRow label="Select blood group" value={bloodGroup} onPress={() => setBloodGroupPickerVisible(true)} colors={colors} />
            ) : (
              <ReadOnlyField value={bloodGroup} placeholder="Not set" colors={colors} />
            )}

            <FieldLabel label="ADDRESS" colors={colors} />
            {isEditing ? (
              <InputField value={address} onChangeText={setAddress} placeholder="Your home address" multiline colors={colors} />
            ) : (
              <ReadOnlyField value={address} placeholder="Not set" multiline colors={colors} />
            )}
          </SectionCard>

          {/* Medical Info */}
          <SectionCard title="Medical Information" colors={colors}>
            <FieldLabel label="ALLERGIES" colors={colors} />
            {isEditing ? (
              <InputField value={allergies} onChangeText={setAllergies} placeholder="e.g. Penicillin, Peanuts" multiline colors={colors} />
            ) : (
              <ReadOnlyField value={allergies} placeholder="None listed" multiline colors={colors} />
            )}

            <FieldLabel label="MEDICAL CONDITIONS" colors={colors} />
            {isEditing ? (
              <InputField value={medicalConditions} onChangeText={setMedicalConditions} placeholder="e.g. Diabetes, Hypertension" multiline colors={colors} />
            ) : (
              <ReadOnlyField value={medicalConditions} placeholder="None listed" multiline colors={colors} />
            )}

            <FieldLabel label="CURRENT MEDICATIONS" colors={colors} />
            {isEditing ? (
              <InputField value={medications} onChangeText={setMedications} placeholder="e.g. Metformin 500mg" multiline colors={colors} />
            ) : (
              <ReadOnlyField value={medications} placeholder="None listed" multiline colors={colors} />
            )}
          </SectionCard>

          {/* Emergency Contacts */}
          <SectionCard title={`Emergency Contacts (${contacts.length}/5)`} colors={colors}>
            {contacts.length === 0 ? (
              <View style={{ alignItems: "center", paddingVertical: 12 }}>
                <Feather name="phone-off" size={28} color={colors.mutedForeground} />
                <Text style={{ marginTop: 8, fontSize: 13, fontFamily: "Inter_400Regular", color: colors.mutedForeground }}>No contacts added yet</Text>
              </View>
            ) : (
              contacts.map((c: any) => (
                <View key={c.id} style={{ backgroundColor: colors.secondary, borderRadius: 12, padding: 12, marginBottom: 8, flexDirection: "row", alignItems: "center", gap: 12, borderWidth: 1, borderColor: colors.border }}>
                  <View style={{ width: 42, height: 42, borderRadius: 21, backgroundColor: `${PRIORITY_COLOR[c.priority] ?? "#7878a0"}22`, alignItems: "center", justifyContent: "center" }}>
                    <Feather name="user" size={20} color={PRIORITY_COLOR[c.priority] ?? colors.mutedForeground} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 2 }}>
                      <Text style={{ fontSize: 14, fontFamily: "Inter_600SemiBold", color: colors.foreground }}>{c.name}</Text>
                      <View style={{ backgroundColor: `${PRIORITY_COLOR[c.priority] ?? "#7878a0"}22`, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 }}>
                        <Text style={{ fontSize: 10, fontFamily: "Inter_600SemiBold", color: PRIORITY_COLOR[c.priority] ?? colors.mutedForeground }}>{c.priority}</Text>
                      </View>
                    </View>
                    <Text style={{ fontSize: 12, fontFamily: "Inter_400Regular", color: colors.mutedForeground }}>{c.relationship} · {c.phone}</Text>
                  </View>
                  <Pressable onPress={() => openEditContact(c)} style={{ padding: 6 }}>
                    <Feather name="edit-2" size={16} color={colors.mutedForeground} />
                  </Pressable>
                  <Pressable onPress={() => handleDeleteContact(c.id)} style={{ padding: 6 }}>
                    <Feather name="trash-2" size={16} color={colors.primary} />
                  </Pressable>
                </View>
              ))
            )}
            {contacts.length < 5 && (
              <Pressable onPress={openAddContact} style={{ marginTop: 4, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 12, borderRadius: 12, borderWidth: 1.5, borderColor: colors.primary, borderStyle: "dashed" }}>
                <Feather name="plus" size={18} color={colors.primary} />
                <Text style={{ fontSize: 14, fontFamily: "Inter_600SemiBold", color: colors.primary }}>Add Contact</Text>
              </Pressable>
            )}
          </SectionCard>

          {/* Save / Cancel — only in edit mode */}
          {isEditing && (
            <>
              <Pressable
                onPress={handleSave}
                disabled={saving}
                style={{ backgroundColor: colors.primary, borderRadius: colors.radius, paddingVertical: 16, alignItems: "center", marginBottom: 10 }}
              >
                {saving ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={{ fontSize: 16, fontFamily: "Inter_700Bold", color: "#fff", letterSpacing: 0.5 }}>Save Changes</Text>
                )}
              </Pressable>

              <Pressable
                onPress={handleCancelEditing}
                disabled={saving}
                style={{ backgroundColor: colors.secondary, borderRadius: colors.radius, paddingVertical: 14, alignItems: "center", marginBottom: 8, borderWidth: 1, borderColor: colors.border }}
              >
                <Text style={{ fontSize: 15, fontFamily: "Inter_600SemiBold", color: colors.foreground }}>Cancel</Text>
              </Pressable>
            </>
          )}

          {/* Inline save confirmation */}
          {saveSuccess && (
            <View style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 8,
              backgroundColor: "rgba(0,230,118,0.10)",
              borderRadius: 12,
              borderWidth: 1,
              borderColor: "rgba(0,230,118,0.30)",
              paddingHorizontal: 14,
              paddingVertical: 11,
              marginBottom: 8,
            }}>
              <Feather name="check-circle" size={18} color="#00e676" />
              <Text style={{ fontSize: 14, fontFamily: "Inter_600SemiBold", color: "#00e676" }}>
                Profile Saved Successfully
              </Text>
            </View>
          )}

        </ScrollView>
      )}

      {/* Gender Picker */}
      <OptionPickerModal visible={genderPickerVisible} title="Select Gender" options={GENDER_OPTIONS} selected={gender} onSelect={setGender} onClose={() => setGenderPickerVisible(false)} colors={colors} />

      {/* Blood Group Picker */}
      <OptionPickerModal visible={bloodGroupPickerVisible} title="Select Blood Group" options={BLOOD_GROUP_OPTIONS} selected={bloodGroup} onSelect={setBloodGroup} onClose={() => setBloodGroupPickerVisible(false)} colors={colors} />

      {/* Contact Modal */}
      <Modal visible={contactModalVisible} transparent animationType="slide" onRequestClose={() => setContactModalVisible(false)}>
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.8)", justifyContent: "flex-end" }}>
          <View style={{ backgroundColor: colors.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: insets.bottom + 24, borderTopWidth: 1, borderColor: colors.border }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <Text style={{ fontSize: 18, fontFamily: "Inter_700Bold", color: colors.foreground }}>{editingContactId ? "Edit Contact" : "Add Contact"}</Text>
              <Pressable onPress={() => setContactModalVisible(false)}>
                <Feather name="x" size={22} color={colors.mutedForeground} />
              </Pressable>
            </View>

            <FieldLabel label="FULL NAME" colors={colors} />
            <InputField value={contactForm.name} onChangeText={(v) => setContactForm((f) => ({ ...f, name: v }))} placeholder="Contact name" colors={colors} />

            <FieldLabel label="PHONE NUMBER" colors={colors} />
            <InputField value={contactForm.phone} onChangeText={(v) => setContactForm((f) => ({ ...f, phone: v }))} placeholder="+1 555 000 0000" colors={colors} />

            <FieldLabel label="RELATIONSHIP" colors={colors} />
            <PickerRow label="Select relationship" value={contactForm.relationship} onPress={() => setRelPickerVisible(true)} colors={colors} />

            <FieldLabel label="PRIORITY" colors={colors} />
            <PickerRow label="Select priority" value={contactForm.priority} onPress={() => setPriPickerVisible(true)} colors={colors} />

            <Pressable onPress={handleSaveContact} style={{ backgroundColor: colors.primary, borderRadius: 14, paddingVertical: 14, alignItems: "center", marginTop: 4 }}>
              <Text style={{ fontSize: 16, fontFamily: "Inter_600SemiBold", color: "#fff" }}>{editingContactId ? "Update Contact" : "Add Contact"}</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      <OptionPickerModal visible={relPickerVisible} title="Relationship" options={RELATIONSHIP_OPTIONS} selected={contactForm.relationship} onSelect={(v) => setContactForm((f) => ({ ...f, relationship: v }))} onClose={() => setRelPickerVisible(false)} colors={colors} />
      <OptionPickerModal visible={priPickerVisible} title="Priority" options={PRIORITY_OPTIONS} selected={contactForm.priority} onSelect={(v) => setContactForm((f) => ({ ...f, priority: v }))} onClose={() => setPriPickerVisible(false)} colors={colors} />
    </View>
  );
}
