import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Platform,
  SafeAreaView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

const BASE_URL =
  Platform.OS === "web" ? "http://localhost:3000" : "http://192.168.0.106:3000";

const CURRENT_SHIPPER_ID = 1;
const STATUS_ONLINE_ID = 1;
const STATUS_OFFLINE_ID = 2;

// Enum/Const trạng thái đơn hàng (Ví dụ: 1 = Pending/Chờ nhận)
const ORDER_STATUS_PENDING = 1;
const ORDER_STATUS_ACCEPTED = 2;

type Shipper = {
  shipper_id: number;
  user_id: number;
  vehicle_type: string;
  license_plate: string;
  status_id: number;
};

type Order = {
  order_id: number;
  restaurant_name?: string;
  pickup_address?: string;
  delivery_address?: string;
  shipping_fee?: number;
  total_amount?: number;
  status_id?: number;
};

type ApiResponse<T> = {
  success: boolean;
  message?: string;
  data: T;
};

export default function HomeScreen() {
  const [isOnline, setIsOnline] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [processingOrderId, setProcessingOrderId] = useState<number | null>(
    null,
  );

  // 1. Tải thông tin Shipper & Danh sách Đơn hàng từ Backend
  const fetchData = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      // 1.1 Fetch thông tin Shipper
      const resShipper = await fetch(
        `${BASE_URL}/api/shippers/${CURRENT_SHIPPER_ID}`,
      );
      if (!resShipper.ok) throw new Error("Lỗi tải thông tin Shipper");
      const shipperResult: ApiResponse<Shipper> = await resShipper.json();

      if (!shipperResult.success) throw new Error(shipperResult.message);
      const onlineState = shipperResult.data.status_id === STATUS_ONLINE_ID;
      setIsOnline(onlineState);

      // 1.2 Fetch danh sách đơn hàng
      const resOrders = await fetch(`${BASE_URL}/api/orders`);
      if (!resOrders.ok) throw new Error("Lỗi tải danh sách đơn hàng");
      const ordersResult: ApiResponse<Order[]> = await resOrders.json();

      if (ordersResult.success) {
        setOrders(ordersResult.data || []);
      }
    } catch (error: any) {
      setErrorMessage(
        error instanceof Error ? error.message : "Đã có lỗi xảy ra",
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // 2. Chuyển đổi trạng thái ONLINE / OFFLINE
  const toggleSwitch = async () => {
    const nextState = !isOnline;
    const newStatusId = nextState ? STATUS_ONLINE_ID : STATUS_OFFLINE_ID;

    setIsUpdating(true);
    try {
      const response = await fetch(
        `${BASE_URL}/api/shippers/${CURRENT_SHIPPER_ID}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status_id: newStatusId }),
        },
      );

      if (!response.ok) throw new Error("Không thể cập nhật trạng thái");

      const result = await response.json();
      if (!result.success)
        throw new Error(result.message || "Cập nhật thất bại");

      setIsOnline(nextState);
    } catch (error) {
      Alert.alert(
        "Thất bại",
        error instanceof Error ? error.message : "Cập nhật thất bại",
      );
    } finally {
      setIsUpdating(false);
    }
  };

  // 3. Xử lý Chấp nhận Đơn hàng (Tạo Delivery + Cập nhật Trạng thái Order)
  const handleAcceptOrder = async (orderId: number) => {
    setProcessingOrderId(orderId);
    try {
      // B1: Tạo bản ghi Delivery cho Shipper
      const deliveryResponse = await fetch(`${BASE_URL}/api/deliveries`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          order_id: orderId,
          shipper_id: CURRENT_SHIPPER_ID,
          delivery_status_id: 1, // Trạng thái: Đang giao
          created_at: new Date().toISOString(),
        }),
      });

      if (!deliveryResponse.ok) throw new Error("Không thể tạo đơn giao hàng");

      // B2: Cập nhật trạng thái Order sang 'Đã nhận'
      const orderUpdateResponse = await fetch(
        `${BASE_URL}/api/orders/${orderId}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status_id: ORDER_STATUS_ACCEPTED }),
        },
      );

      if (!orderUpdateResponse.ok)
        throw new Error("Không thể cập nhật đơn hàng");

      Alert.alert("Thành công", `Đã nhận đơn hàng #${orderId}`);

      // B3: Xóa đơn đã nhận khỏi danh sách hiển thị
      setOrders((prev) => prev.filter((item) => item.order_id !== orderId));
    } catch (error) {
      Alert.alert(
        "Lỗi",
        error instanceof Error ? error.message : "Nhận đơn thất bại",
      );
    } finally {
      setProcessingOrderId(null);
    }
  };

  const renderOrderItem = ({ item }: { item: Order }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.orderId}>Đơn hàng #{item.order_id}</Text>
        <Text style={styles.feeText}>
          {(item.shipping_fee || 0).toLocaleString("vi-VN")}đ
        </Text>
      </View>

      <View style={styles.divider} />

      <View style={styles.addressContainer}>
        <Text style={styles.label}>Lấy hàng tại:</Text>
        <Text style={styles.restaurantName}>
          {item.restaurant_name || "Cửa hàng"}
        </Text>
        <Text style={styles.addressText}>
          {item.pickup_address || "Chưa có địa chỉ"}
        </Text>
      </View>

      <View style={styles.addressContainer}>
        <Text style={styles.label}>Giao đến:</Text>
        <Text style={styles.addressText}>
          {item.delivery_address || "Chưa có địa chỉ"}
        </Text>
      </View>

      <TouchableOpacity
        style={[
          styles.acceptButton,
          (!isOnline || processingOrderId === item.order_id) &&
            styles.disabledButton,
        ]}
        disabled={!isOnline || processingOrderId === item.order_id}
        onPress={() => handleAcceptOrder(item.order_id)}
      >
        {processingOrderId === item.order_id ? (
          <ActivityIndicator color="#FFF" size="small" />
        ) : (
          <Text style={styles.acceptButtonText}>
            {isOnline ? "CHẤP NHẬN ĐƠN" : "TẮT HOẠT ĐỘNG"}
          </Text>
        )}
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.statusContainer}>
        <Text style={styles.statusText}>
          Trạng thái:{" "}
          <Text
            style={{
              color: isOnline ? "#4CAF50" : "#F44336",
              fontWeight: "bold",
            }}
          >
            {isOnline ? "ONLINE (Sẵn sàng nhận đơn)" : "OFFLINE (Đã tắt)"}
          </Text>
        </Text>
        {isUpdating ? (
          <ActivityIndicator size="small" color="#FF5722" />
        ) : (
          <Switch
            trackColor={{ false: "#767577", true: "#81c784" }}
            thumbColor={isOnline ? "#4CAF50" : "#f4f3f4"}
            onValueChange={toggleSwitch}
            value={isOnline}
            disabled={isLoading}
          />
        )}
      </View>

      {isLoading ? (
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color="#FF5722" />
          <Text style={styles.loadingText}>Đang tải thông tin...</Text>
        </View>
      ) : errorMessage ? (
        <View style={styles.centerContent}>
          <Text style={styles.errorText}>{errorMessage}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={fetchData}>
            <Text style={styles.retryText}>Thử lại</Text>
          </TouchableOpacity>
        </View>
      ) : isOnline ? (
        <FlatList
          data={orders}
          keyExtractor={(item) => item.order_id.toString()}
          renderItem={renderOrderItem}
          contentContainerStyle={styles.listContainer}
          onRefresh={fetchData}
          refreshing={isLoading}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>Hiện chưa có đơn hàng nào!</Text>
            </View>
          }
        />
      ) : (
        <View style={styles.offlineView}>
          <Text style={styles.offlineText}>
            Bạn đang ở trạng thái OFFLINE. Hãy bật công tắc để bắt đầu nhận đơn!
          </Text>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F5F5",
  },
  statusContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#FFF",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E0E0E0",
  },
  statusText: {
    fontSize: 15,
  },
  listContainer: {
    padding: 16,
  },
  card: {
    backgroundColor: "#FFF",
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    boxShadow: "0px 1px 3px rgba(0, 0, 0, 0.2)",
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  orderId: {
    fontSize: 16,
    fontWeight: "bold",
  },
  feeText: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#FF5722",
  },
  divider: {
    height: 1,
    backgroundColor: "#EEEEEE",
    marginVertical: 12,
  },
  addressContainer: {
    marginBottom: 10,
  },
  label: {
    fontSize: 12,
    color: "#757575",
    marginBottom: 2,
  },
  restaurantName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#212121",
  },
  addressText: {
    fontSize: 14,
    color: "#424242",
  },
  acceptButton: {
    backgroundColor: "#FF5722",
    paddingVertical: 12,
    borderRadius: 6,
    alignItems: "center",
    marginTop: 8,
  },
  disabledButton: {
    backgroundColor: "#BDBDBD",
  },
  acceptButtonText: {
    color: "#FFF",
    fontWeight: "bold",
    fontSize: 15,
  },
  offlineView: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
  },
  offlineText: {
    textAlign: "center",
    color: "#757575",
    fontSize: 16,
  },
  centerContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  loadingText: {
    marginTop: 12,
    color: "#757575",
  },
  errorText: {
    color: "#F44336",
    fontSize: 15,
    textAlign: "center",
  },
  retryButton: {
    marginTop: 12,
    padding: 10,
    backgroundColor: "#FF5722",
    borderRadius: 6,
  },
  retryText: {
    color: "#FFF",
    fontWeight: "bold",
  },
  emptyContainer: {
    alignItems: "center",
    marginTop: 40,
  },
  emptyText: {
    fontSize: 16,
    color: "#757575",
  },
});
