import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "expo-router";
import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Platform,
  RefreshControl,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

interface DeliveryItem {
  delivery_id: number;
  order_id: number;
  shipper_id?: number;
  pickup_address?: string;
  delivery_address?: string;
  shipping_fee?: number;
  total_amount?: number;
  status?: string; // 'COMPLETED', 'CANCELLED', 'DELIVERING',...
  created_at?: string;
}

export default function ExploreScreen() {
  const [deliveries, setDeliveries] = useState<DeliveryItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [filter, setFilter] = useState<"all" | "completed" | "cancelled">(
    "all",
  );

  const fetchDeliveryHistory = async () => {
    try {
      // 1. Lấy user_id / shipperId từ AsyncStorage
      const shipperId = await AsyncStorage.getItem("shipperId");
      if (!shipperId) {
        setLoading(false);
        return;
      }

      const backendUrl =
        Platform.OS === "web"
          ? "http://localhost:3000"
          : "http://192.168.0.106:3000";

      // 2. Gọi API lấy lịch sử giao hàng theo shipperId
      const response = await fetch(
        `${backendUrl}/api/deliveries/shipper/${shipperId}`,
      );
      const result = await response.json();

      if (response.ok && result.success) {
        setDeliveries(result.data || []);
      }
    } catch (error) {
      console.error("Lỗi khi tải lịch sử giao hàng:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Tự động load dữ liệu mỗi khi người dùng chuyển sang tab Lịch sử
  useFocusEffect(
    useCallback(() => {
      fetchDeliveryHistory();
    }, []),
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchDeliveryHistory();
  };

  // 3. Lọc danh sách theo Tab (Xử lý chữ in hoa từ CSDL MySQL)
  const filteredDeliveries = deliveries.filter((item) => {
    const itemStatus = item.status?.toUpperCase() || "";
    if (filter === "completed") return itemStatus === "COMPLETED";
    if (filter === "cancelled") return itemStatus === "CANCELLED";
    return true;
  });

  // 4. Thống kê số đơn và tổng thu nhập
  const completedCount = deliveries.filter(
    (d) => d.status?.toUpperCase() === "COMPLETED",
  ).length;

  const totalEarnings = deliveries
    .filter((d) => d.status?.toUpperCase() === "COMPLETED")
    .reduce((sum, d) => sum + (Number(d.shipping_fee) || 0), 0);

  const renderOrderItem = ({ item }: { item: DeliveryItem }) => {
    const isCompleted = item.status?.toUpperCase() === "COMPLETED";

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.codeContainer}>
            <Ionicons name="receipt-outline" size={18} color="#FF5722" />
            <Text style={styles.orderCode}>
              Đơn #{item.order_id || item.delivery_id}
            </Text>
          </View>
          <View
            style={[
              styles.statusBadge,
              { backgroundColor: isCompleted ? "#E8F5E9" : "#FFEBEE" },
            ]}
          >
            <Text
              style={[
                styles.statusText,
                { color: isCompleted ? "#2E7D32" : "#C62828" },
              ]}
            >
              {isCompleted ? "Hoàn thành" : item.status || "Đã hủy"}
            </Text>
          </View>
        </View>

        <View style={styles.divider} />

        <View style={styles.addressSection}>
          <View style={styles.addressRow}>
            <Ionicons name="radio-button-on" size={16} color="#FF5722" />
            <Text style={styles.addressText} numberOfLines={1}>
              <Text style={styles.boldText}>Lấy:</Text>{" "}
              {item.pickup_address || "Cửa hàng"}
            </Text>
          </View>
          <View style={styles.addressRow}>
            <Ionicons name="location" size={16} color="#4CAF50" />
            <Text style={styles.addressText} numberOfLines={1}>
              <Text style={styles.boldText}>Giao:</Text>{" "}
              {item.delivery_address || "Địa chỉ khách"}
            </Text>
          </View>
        </View>

        <View style={styles.divider} />

        <View style={styles.cardFooter}>
          <Text style={styles.timeText}>
            {item.created_at
              ? new Date(item.created_at).toLocaleString("vi-VN")
              : "Gần đây"}
          </Text>
          <View style={styles.priceContainer}>
            <Text style={styles.shippingFee}>
              + {(Number(item.shipping_fee) || 0).toLocaleString("vi-VN")}đ
            </Text>
          </View>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Khối thống kê */}
      <View style={styles.summaryContainer}>
        <View style={styles.summaryBox}>
          <Text style={styles.summaryNumber}>{completedCount}</Text>
          <Text style={styles.summaryLabel}>Đơn thành công</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryBox}>
          <Text style={[styles.summaryNumber, { color: "#4CAF50" }]}>
            {totalEarnings.toLocaleString("vi-VN")}đ
          </Text>
          <Text style={styles.summaryLabel}>Thu nhập chuyến</Text>
        </View>
      </View>

      {/* Thanh bộ lọc */}
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

      {/* Danh sách giao hàng */}
      {loading ? (
        <ActivityIndicator
          size="large"
          color="#FF5722"
          style={{ marginTop: 40 }}
        />
      ) : (
        <FlatList
          data={filteredDeliveries}
          keyExtractor={(item) => String(item.delivery_id)}
          renderItem={renderOrderItem}
          contentContainerStyle={styles.listPadding}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="document-text-outline" size={48} color="#CCC" />
              <Text style={styles.emptyText}>
                Chưa có lịch sử giao hàng nào
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F5F5",
  },
  summaryContainer: {
    flexDirection: "row",
    backgroundColor: "#FFF",
    margin: 12,
    paddingVertical: 14,
    borderRadius: 10,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  summaryBox: {
    flex: 1,
    alignItems: "center",
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
    fontSize: 12,
    color: "#666",
    marginTop: 2,
  },
  filterContainer: {
    flexDirection: "row",
    paddingHorizontal: 12,
    marginBottom: 8,
  },
  filterBtn: {
    paddingVertical: 6,
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
  listPadding: {
    paddingHorizontal: 12,
    paddingBottom: 20,
  },
  card: {
    backgroundColor: "#FFF",
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
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
  },
  orderCode: {
    fontSize: 15,
    fontWeight: "bold",
    color: "#333",
    marginLeft: 6,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "600",
  },
  divider: {
    height: 1,
    backgroundColor: "#F0F0F0",
    marginVertical: 10,
  },
  addressSection: {
    gap: 6,
  },
  addressRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  addressText: {
    fontSize: 13,
    color: "#555",
    marginLeft: 8,
    flex: 1,
  },
  boldText: {
    fontWeight: "600",
    color: "#333",
  },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  timeText: {
    fontSize: 12,
    color: "#888",
  },
  priceContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  shippingFee: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#4CAF50",
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 60,
  },
  emptyText: {
    marginTop: 8,
    color: "#888",
    fontSize: 14,
  },
});
