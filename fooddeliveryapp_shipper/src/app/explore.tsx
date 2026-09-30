import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "expo-router";
import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Platform,
  RefreshControl,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

// =====================================================
// BASE URL
// =====================================================

const BASE_URL =
  Platform.OS === "web" ? "http://localhost:3000" : "http://192.168.0.106:3000";

// =====================================================
// TYPE
// =====================================================

interface DeliveryItem {
  delivery_id: number;
  order_id: number;
  shipper_id?: number | null;

  order_code?: string | null;

  restaurant_name?: string | null;
  restaurant_phone?: string | null;

  pickup_address?: string | null;

  receiver_name?: string | null;
  receiver_phone?: string | null;
  delivery_address?: string | null;

  subtotal?: number | null;
  delivery_fee?: number | null;
  shipping_fee?: number | null;
  discount?: number | null;
  total_amount?: number | null;

  delivery_status?: string | null;
  status?: string | null;

  order_status_id?: number | null;

  pickup_time?: string | null;
  delivery_time?: string | null;

  note?: string | null;
  order_note?: string | null;

  created_at?: string | null;
  updated_at?: string | null;
}

// =====================================================
// STATUS
// =====================================================

const getStatus = (item: DeliveryItem): string => {
  return (item.delivery_status || item.status || "").toUpperCase().trim();
};

const getStatusText = (status: string): string => {
  switch (status) {
    case "REQUESTED":
      return "Đang chờ";

    case "ACCEPTED":
      return "Đã nhận đơn";

    case "PICKED_UP":
      return "Đã lấy hàng";

    case "DELIVERING":
      return "Đang giao";

    case "COMPLETED":
      return "Hoàn thành";

    case "CANCELLED":
      return "Đã hủy";

    default:
      return status || "Không xác định";
  }
};

// =====================================================
// EXPLORE SCREEN
// =====================================================

export default function ExploreScreen() {
  const [deliveries, setDeliveries] = useState<DeliveryItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  const [filter, setFilter] = useState<"all" | "completed" | "cancelled">(
    "all",
  );

  // =====================================================
  // LẤY LỊCH SỬ GIAO HÀNG
  // =====================================================

  const fetchDeliveryHistory = async () => {
    try {
      console.log("====================================");
      console.log("FETCH DELIVERY HISTORY");
      console.log("BASE_URL:", BASE_URL);

      // -----------------------------------------------
      // Lấy shipperId
      // -----------------------------------------------

      const shipperId = await AsyncStorage.getItem("shipperId");

      console.log("shipperId:", shipperId);

      if (!shipperId) {
        console.log("Không tìm thấy shipperId.");

        setDeliveries([]);
        setLoading(false);
        setRefreshing(false);

        return;
      }

      // -----------------------------------------------
      // Lấy JWT
      // -----------------------------------------------

      const token = await AsyncStorage.getItem("token");

      console.log("Có token:", !!token);

      if (!token) {
        Alert.alert(
          "Lỗi đăng nhập",
          "Không tìm thấy phiên đăng nhập. Vui lòng đăng nhập lại.",
        );

        setDeliveries([]);
        setLoading(false);
        setRefreshing(false);

        return;
      }

      // -----------------------------------------------
      // Gọi API
      // -----------------------------------------------

      const url = `${BASE_URL}/api/deliveries/shipper/${shipperId}`;

      console.log("URL:", url);

      const response = await fetch(url, {
        method: "GET",
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      console.log("HTTP status:", response.status);

      // -----------------------------------------------
      // Đọc response
      // -----------------------------------------------

      const result = await response.json();

      console.log("API result:", result);

      // -----------------------------------------------
      // JWT hết hạn
      // -----------------------------------------------

      if (response.status === 401) {
        Alert.alert("Phiên đăng nhập hết hạn", "Vui lòng đăng nhập lại.");

        return;
      }

      // -----------------------------------------------
      // API lỗi
      // -----------------------------------------------

      if (!response.ok || !result.success) {
        console.error("API delivery history error:", result.message);

        Alert.alert(
          "Không thể tải dữ liệu",
          result.message || "Có lỗi xảy ra.",
        );

        setDeliveries([]);

        return;
      }

      // -----------------------------------------------
      // Lấy data
      // -----------------------------------------------

      const data: DeliveryItem[] = Array.isArray(result.data)
        ? result.data
        : [];

      console.log("Số delivery:", data.length);

      setDeliveries(data);
    } catch (error) {
      console.error("Lỗi khi tải lịch sử giao hàng:", error);

      Alert.alert(
        "Lỗi kết nối",
        "Không thể kết nối đến server. Hãy kiểm tra backend và Wi-Fi.",
      );

      setDeliveries([]);
    } finally {
      setLoading(false);
      setRefreshing(false);

      console.log("====================================");
    }
  };

  // =====================================================
  // LOAD MỖI KHI VÀO TAB
  // =====================================================

  useFocusEffect(
    useCallback(() => {
      fetchDeliveryHistory();
    }, []),
  );

  // =====================================================
  // REFRESH
  // =====================================================

  const onRefresh = () => {
    setRefreshing(true);
    fetchDeliveryHistory();
  };

  // =====================================================
  // FILTER
  // =====================================================

  const filteredDeliveries = deliveries.filter((item) => {
    const status = getStatus(item);

    if (filter === "completed") {
      return status === "COMPLETED";
    }

    if (filter === "cancelled") {
      return status === "CANCELLED";
    }

    return true;
  });

  // =====================================================
  // THỐNG KÊ
  // =====================================================

  const completedCount = deliveries.filter(
    (item) => getStatus(item) === "COMPLETED",
  ).length;

  const cancelledCount = deliveries.filter(
    (item) => getStatus(item) === "CANCELLED",
  ).length;

  // =====================================================
  // TỔNG PHÍ GIAO HÀNG
  // =====================================================

  const totalEarnings = deliveries
    .filter((item) => getStatus(item) === "COMPLETED")
    .reduce((sum, item) => {
      // Backend hiện tại trả o.delivery_fee
      // nên ưu tiên delivery_fee.
      const fee = Number(item.delivery_fee) || Number(item.shipping_fee) || 0;

      return sum + fee;
    }, 0);

  // =====================================================
  // FORMAT MONEY
  // =====================================================

  const formatMoney = (value?: number | null): string => {
    return `${(Number(value) || 0).toLocaleString("vi-VN")}đ`;
  };

  // =====================================================
  // FORMAT DATE
  // =====================================================

  const formatDate = (value?: string | null): string => {
    if (!value) {
      return "Gần đây";
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return value;
    }

    return date.toLocaleString("vi-VN");
  };

  // =====================================================
  // RENDER DELIVERY
  // =====================================================

  const renderOrderItem = ({ item }: { item: DeliveryItem }) => {
    const status = getStatus(item);

    const isCompleted = status === "COMPLETED";
    const isCancelled = status === "CANCELLED";

    // Màu trạng thái
    let statusBackground = "#FFF3E0";
    let statusColor = "#EF6C00";

    if (isCompleted) {
      statusBackground = "#E8F5E9";
      statusColor = "#2E7D32";
    }

    if (isCancelled) {
      statusBackground = "#FFEBEE";
      statusColor = "#C62828";
    }

    return (
      <View style={styles.card}>
        {/* =========================================
            HEADER
        ========================================== */}

        <View style={styles.cardHeader}>
          <View style={styles.codeContainer}>
            <Ionicons name="receipt-outline" size={19} color="#FF5722" />

            <Text style={styles.orderCode}>
              {item.order_code ? item.order_code : `Đơn #${item.order_id}`}
            </Text>
          </View>

          <View
            style={[
              styles.statusBadge,
              {
                backgroundColor: statusBackground,
              },
            ]}
          >
            <Text
              style={[
                styles.statusText,
                {
                  color: statusColor,
                },
              ]}
            >
              {getStatusText(status)}
            </Text>
          </View>
        </View>

        <View style={styles.divider} />

        {/* =========================================
            RESTAURANT
        ========================================== */}

        {item.restaurant_name ? (
          <View style={styles.restaurantRow}>
            <Ionicons name="storefront-outline" size={17} color="#FF5722" />

            <Text style={styles.restaurantName}>{item.restaurant_name}</Text>
          </View>
        ) : null}

        {/* =========================================
            ĐỊA CHỈ
        ========================================== */}

        <View style={styles.addressSection}>
          {/* Lấy hàng */}

          <View style={styles.addressRow}>
            <Ionicons name="radio-button-on" size={17} color="#FF5722" />

            <Text style={styles.addressText} numberOfLines={2}>
              <Text style={styles.boldText}>Lấy hàng: </Text>
              {item.pickup_address || "Chưa có địa chỉ lấy hàng"}
            </Text>
          </View>

          {/* Đường nối */}

          <View style={styles.verticalLine} />

          {/* Giao hàng */}

          <View style={styles.addressRow}>
            <Ionicons name="location" size={18} color="#4CAF50" />

            <Text style={styles.addressText} numberOfLines={2}>
              <Text style={styles.boldText}>Giao hàng: </Text>
              {item.delivery_address || "Chưa có địa chỉ giao hàng"}
            </Text>
          </View>
        </View>

        <View style={styles.divider} />

        {/* =========================================
            KHÁCH HÀNG
        ========================================== */}

        {item.receiver_name ? (
          <View style={styles.infoRow}>
            <Ionicons name="person-outline" size={16} color="#777" />

            <Text style={styles.infoText}>
              {item.receiver_name}

              {item.receiver_phone ? ` • ${item.receiver_phone}` : ""}
            </Text>
          </View>
        ) : null}

        {/* =========================================
            THỜI GIAN
        ========================================== */}

        <View style={styles.infoRow}>
          <Ionicons name="time-outline" size={16} color="#777" />

          <Text style={styles.infoText}>
            {isCompleted && item.delivery_time
              ? `Hoàn thành: ${formatDate(item.delivery_time)}`
              : formatDate(item.created_at)}
          </Text>
        </View>

        {/* =========================================
            FOOTER
        ========================================== */}

        <View style={styles.divider} />

        <View style={styles.cardFooter}>
          <View>
            <Text style={styles.footerLabel}>Phí giao hàng</Text>

            <Text style={styles.shippingFee}>
              + {formatMoney(item.delivery_fee ?? item.shipping_fee)}
            </Text>
          </View>

          <View style={styles.totalContainer}>
            <Text style={styles.footerLabel}>Tổng đơn</Text>

            <Text style={styles.totalAmount}>
              {formatMoney(item.total_amount)}
            </Text>
          </View>
        </View>
      </View>
    );
  };

  // =====================================================
  // RENDER
  // =====================================================

  return (
    <SafeAreaView style={styles.container}>
      {/* ===========================================
          THỐNG KÊ
      ============================================ */}

      <View style={styles.summaryContainer}>
        {/* Tổng hoàn thành */}

        <View style={styles.summaryBox}>
          <Text style={styles.summaryNumber}>{completedCount}</Text>

          <Text style={styles.summaryLabel}>Đơn thành công</Text>
        </View>

        <View style={styles.summaryDivider} />

        {/* Tổng thu nhập */}

        <View style={styles.summaryBox}>
          <Text
            style={[
              styles.summaryNumber,
              {
                color: "#4CAF50",
                fontSize: 16,
              },
            ]}
          >
            {totalEarnings.toLocaleString("vi-VN")}đ
          </Text>

          <Text style={styles.summaryLabel}>Thu nhập chuyến</Text>
        </View>

        <View style={styles.summaryDivider} />

        {/* Đã hủy */}

        <View style={styles.summaryBox}>
          <Text
            style={[
              styles.summaryNumber,
              {
                color: "#C62828",
              },
            ]}
          >
            {cancelledCount}
          </Text>

          <Text style={styles.summaryLabel}>Đã hủy</Text>
        </View>
      </View>

      {/* ===========================================
          FILTER
      ============================================ */}

      <View style={styles.filterContainer}>
        {(["all", "completed", "cancelled"] as const).map((type) => (
          <TouchableOpacity
            key={type}
            style={[
              styles.filterBtn,
              filter === type && styles.filterBtnActive,
            ]}
            onPress={() => setFilter(type)}
          >
            <Text
              style={[
                styles.filterText,
                filter === type && styles.filterTextActive,
              ]}
            >
              {type === "all"
                ? "Tất cả"
                : type === "completed"
                  ? "Hoàn thành"
                  : "Đã hủy"}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* ===========================================
          DANH SÁCH
      ============================================ */}

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF5722" />

          <Text style={styles.loadingText}>Đang tải lịch sử giao hàng...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredDeliveries}
          keyExtractor={(item) => String(item.delivery_id)}
          renderItem={renderOrderItem}
          contentContainerStyle={styles.listPadding}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="document-text-outline" size={56} color="#CCC" />

              <Text style={styles.emptyText}>
                {filter === "completed"
                  ? "Chưa có đơn hoàn thành"
                  : filter === "cancelled"
                    ? "Chưa có đơn đã hủy"
                    : "Chưa có lịch sử giao hàng nào"}
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

// =====================================================
// STYLE
// =====================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F5F5",
  },

  // ===================================================
  // SUMMARY
  // ===================================================

  summaryContainer: {
    flexDirection: "row",
    backgroundColor: "#FFF",
    marginHorizontal: 12,
    marginTop: 12,
    marginBottom: 10,
    paddingVertical: 14,
    borderRadius: 10,

    elevation: 2,

    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },

  summaryBox: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  summaryDivider: {
    width: 1,
    backgroundColor: "#EEE",
  },

  summaryNumber: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#FF5722",
  },

  summaryLabel: {
    fontSize: 11,
    color: "#666",
    marginTop: 3,
    textAlign: "center",
  },

  // ===================================================
  // FILTER
  // ===================================================

  filterContainer: {
    flexDirection: "row",
    paddingHorizontal: 12,
    marginBottom: 8,
  },

  filterBtn: {
    paddingVertical: 7,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: "#E0E0E0",
    marginRight: 8,
  },

  filterBtnActive: {
    backgroundColor: "#FF5722",
  },

  filterText: {
    fontSize: 13,
    color: "#424242",
    fontWeight: "500",
  },

  filterTextActive: {
    color: "#FFF",
    fontWeight: "bold",
  },

  // ===================================================
  // LIST
  // ===================================================

  listPadding: {
    paddingHorizontal: 12,
    paddingBottom: 30,
  },

  // ===================================================
  // CARD
  // ===================================================

  card: {
    backgroundColor: "#FFF",
    borderRadius: 10,
    padding: 13,
    marginBottom: 10,

    elevation: 2,

    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.08,
    shadowRadius: 2,
  },

  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  codeContainer: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },

  orderCode: {
    fontSize: 15,
    fontWeight: "bold",
    color: "#333",
    marginLeft: 6,
    flexShrink: 1,
  },

  statusBadge: {
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 6,
    marginLeft: 8,
  },

  statusText: {
    fontSize: 11,
    fontWeight: "600",
  },

  divider: {
    height: 1,
    backgroundColor: "#F0F0F0",
    marginVertical: 10,
  },

  // ===================================================
  // RESTAURANT
  // ===================================================

  restaurantRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 9,
  },

  restaurantName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    marginLeft: 7,
  },

  // ===================================================
  // ADDRESS
  // ===================================================

  addressSection: {
    position: "relative",
  },

  addressRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    minHeight: 30,
  },

  addressText: {
    fontSize: 13,
    color: "#555",
    marginLeft: 8,
    flex: 1,
    lineHeight: 19,
  },

  boldText: {
    fontWeight: "600",
    color: "#333",
  },

  verticalLine: {
    position: "absolute",
    left: 8,
    top: 18,
    height: 22,
    width: 1,
    backgroundColor: "#CCC",
  },

  // ===================================================
  // INFO
  // ===================================================

  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
  },

  infoText: {
    fontSize: 12,
    color: "#777",
    marginLeft: 7,
    flex: 1,
  },

  // ===================================================
  // FOOTER
  // ===================================================

  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },

  footerLabel: {
    fontSize: 11,
    color: "#888",
    marginBottom: 2,
  },

  shippingFee: {
    fontSize: 15,
    fontWeight: "bold",
    color: "#4CAF50",
  },

  totalContainer: {
    alignItems: "flex-end",
  },

  totalAmount: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
  },

  // ===================================================
  // LOADING
  // ===================================================

  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  loadingText: {
    marginTop: 10,
    fontSize: 13,
    color: "#777",
  },

  // ===================================================
  // EMPTY
  // ===================================================

  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 70,
  },

  emptyText: {
    marginTop: 10,
    color: "#888",
    fontSize: 14,
    textAlign: "center",
  },
});
