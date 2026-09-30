import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { API_BASE_URL } from "../constants/api";

// =====================================================
// STATUS
// =====================================================

const STATUS_OFFLINE_ID = 1;
const STATUS_ONLINE_ID = 2;
const STATUS_BUSY_ID = 3;

const USER_ACTIVE_ID = 1;
const USER_LOCKED_ID = 2;

// =====================================================
// TYPE
// =====================================================

type ShipperProfile = {
  shipper_id: number;
  user_id: number;
  full_name: string;
  phone: string;
  status_id: number;

  email: string;
  user_status_id: number;

  created_at?: string;
  updated_at?: string;
};

type ApiResponse<T> = {
  success: boolean;
  message?: string;
  data?: T;
};

// =====================================================
// COMPONENT
// =====================================================

export default function ProfileScreen() {
  const router = useRouter();

  const [profile, setProfile] = useState<ShipperProfile | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const [isEditing, setIsEditing] = useState(false);

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");

  const [isSaving, setIsSaving] = useState(false);

  const [errorMessage, setErrorMessage] = useState("");

  // =====================================================
  // GET TOKEN
  // =====================================================

  const getToken = useCallback(async (): Promise<string | null> => {
    const token = await AsyncStorage.getItem("token");

    if (!token) {
      router.replace("/LoginScreen");
      return null;
    }

    return token;
  }, [router]);

  // =====================================================
  // FETCH WITH JWT
  // =====================================================

  const fetchWithAuth = useCallback(
    async (
      url: string,
      options: RequestInit = {},
    ): Promise<Response | null> => {
      const token = await getToken();

      if (!token) {
        return null;
      }

      const headers = new Headers(options.headers);

      headers.set("Authorization", `Bearer ${token}`);

      if (!headers.has("Content-Type") && options.body) {
        headers.set("Content-Type", "application/json");
      }

      const response = await fetch(url, {
        ...options,
        headers,
      });

      // =================================================
      // TOKEN HẾT HẠN / KHÔNG HỢP LỆ
      // =================================================

      if (response.status === 401) {
        await AsyncStorage.multiRemove(["token", "shipperId", "shipperInfo"]);

        router.replace("/LoginScreen");

        return null;
      }

      return response;
    },
    [getToken, router],
  );

  // =====================================================
  // LOAD PROFILE
  // =====================================================

  const fetchProfile = useCallback(
    async (showLoading = true) => {
      try {
        if (showLoading) {
          setIsLoading(true);
        }

        setErrorMessage("");

        const shipperId = await AsyncStorage.getItem("shipperId");
        if (!shipperId) {
          throw new Error("Không tìm thấy mã Shipper trong phiên đăng nhập.");
        }

        const [shipperResponse, userResponse] = await Promise.all([
          fetchWithAuth(`${API_BASE_URL}/api/shippers/${shipperId}`),
          fetchWithAuth(`${API_BASE_URL}/api/auth/me`),
        ]);

        if (!shipperResponse || !userResponse) {
          return;
        }

        const [shipperResult, userResult]: [
          ApiResponse<ShipperProfile>,
          ApiResponse<{ email: string }>,
        ] = await Promise.all([shipperResponse.json(), userResponse.json()]);

        if (
          !shipperResponse.ok ||
          !shipperResult.success ||
          !shipperResult.data ||
          !userResponse.ok ||
          !userResult.success ||
          !userResult.data
        ) {
          throw new Error(
            shipperResult.message ||
              userResult.message ||
              "Không thể lấy thông tin cá nhân.",
          );
        }

        const profileData: ShipperProfile = {
          ...shipperResult.data,
          email: userResult.data.email,
          user_status_id: USER_ACTIVE_ID,
        };

        setProfile(profileData);
        setFullName(profileData.full_name || "");
        setPhone(profileData.phone || "");

        // Lưu lại thông tin mới nhất
        await AsyncStorage.setItem("shipperInfo", JSON.stringify(profileData));
      } catch (error) {
        console.error("FETCH PROFILE ERROR:", error);

        const message =
          error instanceof Error
            ? error.message
            : "Không thể tải thông tin cá nhân.";

        setErrorMessage(message);
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [fetchWithAuth],
  );

  // =====================================================
  // LOAD WHEN TAB PROFILE IS FOCUSED
  // =====================================================

  useFocusEffect(
    useCallback(() => {
      fetchProfile(true);

      return () => {};
    }, [fetchProfile]),
  );

  // =====================================================
  // REFRESH
  // =====================================================

  const handleRefresh = async () => {
    setIsRefreshing(true);

    await fetchProfile(false);
  };

  // =====================================================
  // GET STATUS
  // =====================================================

  const getShipperStatus = () => {
    if (!profile) {
      return {
        text: "Không xác định",
        icon: "help-circle-outline" as const,
        background: "#EEEEEE",
        color: "#757575",
      };
    }

    switch (profile.status_id) {
      case STATUS_ONLINE_ID:
        return {
          text: "Đang Online",
          icon: "radio-button-on-outline" as const,
          background: "#E8F5E9",
          color: "#2E7D32",
        };

      case STATUS_BUSY_ID:
        return {
          text: "Đang giao hàng",
          icon: "bicycle-outline" as const,
          background: "#FFF3E0",
          color: "#EF6C00",
        };

      case STATUS_OFFLINE_ID:
      default:
        return {
          text: "Đang Offline",
          icon: "radio-button-off-outline" as const,
          background: "#F5F5F5",
          color: "#757575",
        };
    }
  };

  // =====================================================
  // GET USER ACCOUNT STATUS
  // =====================================================

  const getUserStatus = () => {
    if (!profile) {
      return {
        text: "Không xác định",
        color: "#757575",
      };
    }

    if (profile.user_status_id === USER_ACTIVE_ID) {
      return {
        text: "Đang hoạt động",
        color: "#2E7D32",
      };
    }

    if (profile.user_status_id === USER_LOCKED_ID) {
      return {
        text: "Tài khoản bị khóa",
        color: "#D32F2F",
      };
    }

    return {
      text: "Không xác định",
      color: "#757575",
    };
  };

  // =====================================================
  // SAVE PROFILE
  // =====================================================

  const saveProfile = async () => {
    const trimmedName = fullName.trim();
    const trimmedPhone = phone.trim();

    if (!trimmedName) {
      Alert.alert("Thông báo", "Vui lòng nhập họ và tên.");
      return;
    }

    if (!trimmedPhone) {
      Alert.alert("Thông báo", "Vui lòng nhập số điện thoại.");
      return;
    }

    if (!/^[0-9]{9,11}$/.test(trimmedPhone)) {
      Alert.alert("Thông báo", "Số điện thoại phải gồm từ 9 đến 11 chữ số.");
      return;
    }

    try {
      setIsSaving(true);

      const response = await fetchWithAuth(`${API_BASE_URL}/api/auth/me`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fullName: trimmedName,
          phone: trimmedPhone,
        }),
      });

      if (!response) {
        return;
      }

      const result: ApiResponse<unknown> = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Không thể cập nhật thông tin.");
      }

      setIsEditing(false);

      Alert.alert("Thành công", "Thông tin cá nhân đã được cập nhật.");

      await fetchProfile(false);
    } catch (error) {
      console.error("UPDATE PROFILE ERROR:", error);

      const message =
        error instanceof Error
          ? error.message
          : "Không thể cập nhật thông tin.";

      Alert.alert("Lỗi", message);
    } finally {
      setIsSaving(false);
    }
  };

  // =====================================================
  // LOGOUT
  // =====================================================

  const performLogout = async () => {
    await AsyncStorage.multiRemove(["token", "shipperId", "shipperInfo"]);

    setProfile(null);

    router.replace("/LoginScreen");
  };

  const handleLogout = () => {
    if (Platform.OS === "web") {
      void performLogout();
      return;
    }

    Alert.alert(
      "Đăng xuất",
      "Bạn có chắc chắn muốn đăng xuất khỏi tài khoản?",
      [
        {
          text: "Hủy",
          style: "cancel",
        },
        {
          text: "Đăng xuất",
          style: "destructive",
          onPress: () => {
            void performLogout();
          },
        },
      ],
    );
  };

  // =====================================================
  // LOADING
  // =====================================================

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FF5722" />

        <Text style={styles.loadingText}>Đang tải thông tin...</Text>
      </View>
    );
  }

  // =====================================================
  // ERROR
  // =====================================================

  if (!profile) {
    return (
      <View style={styles.errorContainer}>
        <View style={styles.errorIcon}>
          <Ionicons name="person-outline" size={42} color="#FF5722" />
        </View>

        <Text style={styles.errorTitle}>Không thể tải thông tin</Text>

        <Text style={styles.errorText}>
          {errorMessage || "Đã xảy ra lỗi khi lấy thông tin Shipper."}
        </Text>

        <TouchableOpacity
          style={styles.retryButton}
          onPress={() => fetchProfile(true)}
          activeOpacity={0.8}
        >
          <Ionicons name="refresh-outline" size={20} color="#FFFFFF" />

          <Text style={styles.retryButtonText}>Thử lại</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const shipperStatus = getShipperStatus();
  const userStatus = getUserStatus();

  // =====================================================
  // UI
  // =====================================================

  return (
    <View style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            colors={["#FF5722"]}
            tintColor="#FF5722"
          />
        }
      >
        {/* ============================================= */}
        {/* PROFILE HEADER */}
        {/* ============================================= */}

        <View style={styles.profileHeader}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {profile.full_name
                ? profile.full_name.trim().charAt(0).toUpperCase()
                : "S"}
            </Text>
          </View>

          <Text style={styles.profileName}>{profile.full_name}</Text>

          <Text style={styles.profileRole}>Shipper #{profile.shipper_id}</Text>

          <View
            style={[
              styles.statusBadge,
              {
                backgroundColor: shipperStatus.background,
              },
            ]}
          >
            <Ionicons
              name={shipperStatus.icon}
              size={17}
              color={shipperStatus.color}
            />

            <Text
              style={[
                styles.statusBadgeText,
                {
                  color: shipperStatus.color,
                },
              ]}
            >
              {shipperStatus.text}
            </Text>
          </View>
        </View>

        {/* ============================================= */}
        {/* PERSONAL INFORMATION */}
        {/* ============================================= */}

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.cardTitleLeft}>
              <View style={styles.sectionIcon}>
                <Ionicons name="person-outline" size={19} color="#FF5722" />
              </View>

              <Text style={styles.cardTitle}>Thông tin cá nhân</Text>
            </View>

            <TouchableOpacity
              onPress={() => {
                if (isEditing) {
                  setFullName(profile.full_name);
                  setPhone(profile.phone);
                }

                setIsEditing(!isEditing);
              }}
              activeOpacity={0.7}
            >
              <Ionicons
                name={isEditing ? "close-outline" : "create-outline"}
                size={22}
                color="#FF5722"
              />
            </TouchableOpacity>
          </View>

          {/* FULL NAME */}

          <View style={styles.infoRow}>
            <View style={styles.infoIcon}>
              <Ionicons name="person-outline" size={20} color="#777" />
            </View>

            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Họ và tên</Text>

              {isEditing ? (
                <TextInput
                  value={fullName}
                  onChangeText={setFullName}
                  placeholder="Nhập họ và tên"
                  placeholderTextColor="#999"
                  style={styles.input}
                  maxLength={100}
                />
              ) : (
                <Text style={styles.infoValue}>{profile.full_name}</Text>
              )}
            </View>
          </View>

          {/* PHONE */}

          <View style={styles.infoRow}>
            <View style={styles.infoIcon}>
              <Ionicons name="call-outline" size={20} color="#777" />
            </View>

            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Số điện thoại</Text>

              {isEditing ? (
                <TextInput
                  value={phone}
                  onChangeText={setPhone}
                  placeholder="Nhập số điện thoại"
                  placeholderTextColor="#999"
                  style={styles.input}
                  keyboardType="phone-pad"
                  maxLength={11}
                />
              ) : (
                <Text style={styles.infoValue}>{profile.phone}</Text>
              )}
            </View>
          </View>

          {/* EMAIL */}

          <View style={styles.infoRow}>
            <View style={styles.infoIcon}>
              <Ionicons name="mail-outline" size={20} color="#777" />
            </View>

            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Email</Text>

              <Text style={styles.infoValue}>{profile.email}</Text>
            </View>
          </View>

          {/* SAVE */}

          {isEditing && (
            <TouchableOpacity
              style={styles.saveButton}
              onPress={saveProfile}
              disabled={isSaving}
              activeOpacity={0.8}
            >
              {isSaving ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons name="save-outline" size={20} color="#FFFFFF" />

                  <Text style={styles.saveButtonText}>Lưu thay đổi</Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </View>

        {/* ============================================= */}
        {/* ACCOUNT INFORMATION */}
        {/* ============================================= */}

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.cardTitleLeft}>
              <View style={styles.sectionIcon}>
                <Ionicons
                  name="shield-checkmark-outline"
                  size={19}
                  color="#FF5722"
                />
              </View>

              <Text style={styles.cardTitle}>Thông tin tài khoản</Text>
            </View>
          </View>

          {/* SHIPPER ID */}

          <View style={styles.simpleRow}>
            <View style={styles.simpleRowLeft}>
              <Ionicons name="id-card-outline" size={21} color="#777" />

              <Text style={styles.simpleRowLabel}>Shipper ID</Text>
            </View>

            <Text style={styles.simpleRowValue}>#{profile.shipper_id}</Text>
          </View>

          {/* USER ID */}

          <View style={styles.simpleRow}>
            <View style={styles.simpleRowLeft}>
              <Ionicons name="person-circle-outline" size={21} color="#777" />

              <Text style={styles.simpleRowLabel}>User ID</Text>
            </View>

            <Text style={styles.simpleRowValue}>#{profile.user_id}</Text>
          </View>

          {/* ROLE */}

          <View style={styles.simpleRow}>
            <View style={styles.simpleRowLeft}>
              <Ionicons name="briefcase-outline" size={21} color="#777" />

              <Text style={styles.simpleRowLabel}>Vai trò</Text>
            </View>

            <Text style={styles.simpleRowValue}>Shipper</Text>
          </View>

          {/* ACCOUNT STATUS */}

          <View style={styles.simpleRow}>
            <View style={styles.simpleRowLeft}>
              <Ionicons
                name="checkmark-circle-outline"
                size={21}
                color="#777"
              />

              <Text style={styles.simpleRowLabel}>Trạng thái tài khoản</Text>
            </View>

            <Text
              style={[
                styles.simpleRowValue,
                {
                  color: userStatus.color,
                },
              ]}
            >
              {userStatus.text}
            </Text>
          </View>
        </View>

        {/* ============================================= */}
        {/* SHIPPER STATUS */}
        {/* ============================================= */}

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.cardTitleLeft}>
              <View style={styles.sectionIcon}>
                <Ionicons name="bicycle-outline" size={19} color="#FF5722" />
              </View>

              <Text style={styles.cardTitle}>Trạng thái hoạt động</Text>
            </View>
          </View>

          <View style={styles.activityStatus}>
            <View
              style={[
                styles.bigStatusIcon,
                {
                  backgroundColor: shipperStatus.background,
                },
              ]}
            >
              <Ionicons
                name={shipperStatus.icon}
                size={32}
                color={shipperStatus.color}
              />
            </View>

            <View style={styles.activityStatusContent}>
              <Text style={styles.activityStatusTitle}>
                {shipperStatus.text}
              </Text>

              <Text style={styles.activityStatusDescription}>
                {profile.status_id === STATUS_ONLINE_ID
                  ? "Bạn đang sẵn sàng nhận đơn hàng."
                  : profile.status_id === STATUS_BUSY_ID
                    ? "Bạn đang thực hiện một đơn giao hàng."
                    : "Bạn đang ngoại tuyến và chưa nhận đơn."}
              </Text>
            </View>
          </View>
        </View>

        {/* ============================================= */}
        {/* ACCOUNT DATE */}
        {/* ============================================= */}

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.cardTitleLeft}>
              <View style={styles.sectionIcon}>
                <Ionicons name="calendar-outline" size={19} color="#FF5722" />
              </View>

              <Text style={styles.cardTitle}>Thông tin thời gian</Text>
            </View>
          </View>

          <View style={styles.simpleRow}>
            <View style={styles.simpleRowLeft}>
              <Ionicons name="calendar-outline" size={21} color="#777" />

              <Text style={styles.simpleRowLabel}>Ngày tạo tài khoản</Text>
            </View>

            <Text style={styles.dateValue}>
              {profile.created_at ? formatDate(profile.created_at) : "--"}
            </Text>
          </View>

          <View style={styles.simpleRow}>
            <View style={styles.simpleRowLeft}>
              <Ionicons name="time-outline" size={21} color="#777" />

              <Text style={styles.simpleRowLabel}>Cập nhật lần cuối</Text>
            </View>

            <Text style={styles.dateValue}>
              {profile.updated_at ? formatDate(profile.updated_at) : "--"}
            </Text>
          </View>
        </View>

        {/* ============================================= */}
        {/* LOGOUT */}
        {/* ============================================= */}

        <TouchableOpacity
          style={styles.logoutButton}
          onPress={handleLogout}
          activeOpacity={0.8}
        >
          <Ionicons name="log-out-outline" size={22} color="#D32F2F" />

          <Text style={styles.logoutText}>Đăng xuất</Text>
        </TouchableOpacity>

        <Text style={styles.footerText}>Food Delivery - Shipper App</Text>
      </ScrollView>
    </View>
  );
}

// =====================================================
// FORMAT DATE
// =====================================================

function formatDate(dateString: string): string {
  const date = new Date(dateString);

  if (Number.isNaN(date.getTime())) {
    return "--";
  }

  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();

  return `${day}/${month}/${year}`;
}

// =====================================================
// STYLES
// =====================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F5F5",
  },

  scrollContent: {
    padding: 16,
    paddingBottom: 30,
  },

  // ===================================================
  // LOADING
  // ===================================================

  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F5F5F5",
  },

  loadingText: {
    marginTop: 12,
    fontSize: 15,
    color: "#666",
  },

  // ===================================================
  // ERROR
  // ===================================================

  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 30,
    backgroundColor: "#F5F5F5",
  },

  errorIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#FFF3E0",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 18,
  },

  errorTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#333",
    marginBottom: 8,
  },

  errorText: {
    textAlign: "center",
    fontSize: 14,
    color: "#777",
    lineHeight: 21,
    marginBottom: 20,
  },

  retryButton: {
    height: 46,
    paddingHorizontal: 24,
    borderRadius: 12,
    backgroundColor: "#FF5722",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },

  retryButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },

  // ===================================================
  // PROFILE HEADER
  // ===================================================

  profileHeader: {
    backgroundColor: "#FF5722",
    borderRadius: 18,
    paddingVertical: 25,
    paddingHorizontal: 20,
    alignItems: "center",
    marginBottom: 14,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 3,
  },

  avatar: {
    width: 82,
    height: 82,
    borderRadius: 41,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },

  avatarText: {
    fontSize: 36,
    fontWeight: "800",
    color: "#FF5722",
  },

  profileName: {
    fontSize: 23,
    fontWeight: "800",
    color: "#FFFFFF",
    textAlign: "center",
  },

  profileRole: {
    marginTop: 5,
    fontSize: 14,
    color: "#FFE0D6",
  },

  statusBadge: {
    marginTop: 14,
    paddingHorizontal: 13,
    paddingVertical: 7,
    borderRadius: 20,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },

  statusBadgeText: {
    fontSize: 13,
    fontWeight: "700",
  },

  // ===================================================
  // CARD
  // ===================================================

  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },

  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 5,
  },

  cardTitleLeft: {
    flexDirection: "row",
    alignItems: "center",
  },

  sectionIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#FFF3E0",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },

  cardTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: "#333",
  },

  // ===================================================
  // INFORMATION ROW
  // ===================================================

  infoRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },

  infoIcon: {
    width: 38,
    alignItems: "center",
    paddingTop: 2,
  },

  infoContent: {
    flex: 1,
    marginLeft: 8,
  },

  infoLabel: {
    fontSize: 12,
    color: "#999",
    marginBottom: 4,
  },

  infoValue: {
    fontSize: 16,
    color: "#333",
    fontWeight: "600",
  },

  input: {
    borderWidth: 1,
    borderColor: "#DDDDDD",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 15,
    color: "#333",
    backgroundColor: "#FAFAFA",
  },

  // ===================================================
  // SAVE
  // ===================================================

  saveButton: {
    marginTop: 16,
    height: 46,
    borderRadius: 12,
    backgroundColor: "#FF5722",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },

  saveButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },

  // ===================================================
  // SIMPLE ROW
  // ===================================================

  simpleRow: {
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },

  simpleRowLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },

  simpleRowLabel: {
    marginLeft: 12,
    fontSize: 14,
    color: "#555",
  },

  simpleRowValue: {
    fontSize: 14,
    color: "#333",
    fontWeight: "700",
    textAlign: "right",
    maxWidth: "50%",
  },

  dateValue: {
    fontSize: 13,
    color: "#555",
    fontWeight: "600",
    textAlign: "right",
  },

  // ===================================================
  // ACTIVITY STATUS
  // ===================================================

  activityStatus: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
  },

  bigStatusIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 15,
  },

  activityStatusContent: {
    flex: 1,
  },

  activityStatusTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: "#333",
    marginBottom: 5,
  },

  activityStatusDescription: {
    fontSize: 13,
    lineHeight: 19,
    color: "#777",
  },

  // ===================================================
  // LOGOUT
  // ===================================================

  logoutButton: {
    height: 52,
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#FFCDD2",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginBottom: 14,
  },

  logoutText: {
    color: "#D32F2F",
    fontSize: 15,
    fontWeight: "700",
  },

  footerText: {
    textAlign: "center",
    color: "#AAAAAA",
    fontSize: 12,
    marginBottom: 10,
  },
});
