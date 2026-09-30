// import AsyncStorage from "@react-native-async-storage/async-storage";
// import { useRouter } from "expo-router";
// import { useEffect, useState } from "react";
// import {
//   ActivityIndicator,
//   Alert,
//   FlatList,
//   Platform,
//   SafeAreaView,
//   StyleSheet,
//   Switch,
//   Text,
//   TouchableOpacity,
//   View,
// } from "react-native";

// const BASE_URL =
//   Platform.OS === "web" ? "http://localhost:3000" : "http://192.168.0.106:3000";

// const STATUS_OFFLINE_ID = 1;
// const STATUS_ONLINE_ID = 2;

// const ORDER_STATUS_PENDING = 1;
// const ORDER_STATUS_ACCEPTED = 2;

// type Shipper = {
//   shipper_id: number;
//   user_id: number;
//   full_name?: string;
//   phone?: string;
//   status_id: number;
// };

// type Order = {
//   order_id: number;
//   restaurant_name?: string;
//   pickup_address?: string;
//   delivery_address?: string;
//   shipping_fee?: number;
//   total_amount?: number;
//   status_id?: number;
// };

// type ApiResponse<T> = {
//   success: boolean;
//   message?: string;
//   data: T;
// };

// export default function HomeScreen() {
//   const router = useRouter();

//   const [shipperId, setShipperId] = useState<number | null>(null);

//   const [isOnline, setIsOnline] = useState(false);
//   const [isLoading, setIsLoading] = useState(true);
//   const [isUpdating, setIsUpdating] = useState(false);
//   const [errorMessage, setErrorMessage] = useState<string | null>(null);
//   const [orders, setOrders] = useState<Order[]>([]);
//   const [processingOrderId, setProcessingOrderId] = useState<number | null>(
//     null,
//   );

//   // ============================================================
//   // HÀM XỬ LÝ LỖI
//   // ============================================================

//   const getErrorMessage = (error: unknown): string => {
//     if (error instanceof Error) {
//       return error.message;
//     }

//     return "Đã có lỗi xảy ra";
//   };

//   // ============================================================
//   // LẤY TOKEN + SHIPPER ID
//   // ============================================================

//   const getAuthData = async () => {
//     const token = await AsyncStorage.getItem("token");
//     const savedShipperId = await AsyncStorage.getItem("shipperId");

//     if (!token) {
//       throw new Error("Bạn chưa đăng nhập. Vui lòng đăng nhập lại.");
//     }

//     if (!savedShipperId) {
//       throw new Error(
//         "Không tìm thấy thông tin shipper. Vui lòng đăng nhập lại.",
//       );
//     }

//     const parsedShipperId = Number(savedShipperId);

//     if (!Number.isInteger(parsedShipperId) || parsedShipperId <= 0) {
//       throw new Error("Mã shipper không hợp lệ.");
//     }

//     setShipperId(parsedShipperId);

//     return {
//       token,
//       shipperId: parsedShipperId,
//     };
//   };

//   // ============================================================
//   // FETCH CÓ JWT
//   // ============================================================

//   const fetchWithAuth = async (
//     url: string,
//     options: RequestInit = {},
//   ): Promise<Response> => {
//     const token = await AsyncStorage.getItem("token");

//     if (!token) {
//       throw new Error("Phiên đăng nhập không tồn tại.");
//     }

//     const headers = new Headers(options.headers);

//     headers.set("Content-Type", "application/json");
//     headers.set("Authorization", `Bearer ${token}`);

//     const response = await fetch(url, {
//       ...options,
//       headers,
//     });

//     // Token hết hạn hoặc không hợp lệ
//     if (response.status === 401) {
//       await AsyncStorage.multiRemove(["token", "shipperId", "shipperInfo"]);

//       router.replace("/LoginScreen");

//       throw new Error("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.");
//     }

//     return response;
//   };

//   // ============================================================
//   // ĐĂNG XUẤT
//   // ============================================================

//   const handleLogout = async () => {
//     Alert.alert("Đăng xuất", "Bạn có chắc muốn đăng xuất không?", [
//       {
//         text: "Hủy",
//         style: "cancel",
//       },
//       {
//         text: "Đăng xuất",
//         style: "destructive",
//         onPress: async () => {
//           try {
//             await AsyncStorage.multiRemove([
//               "token",
//               "shipperId",
//               "shipperInfo",
//             ]);

//             router.replace("/LoginScreen");
//           } catch (error) {
//             Alert.alert("Lỗi", getErrorMessage(error));
//           }
//         },
//       },
//     ]);
//   };

//   // ============================================================
//   // 1. TẢI THÔNG TIN SHIPPER + ĐƠN HÀNG
//   // ============================================================

//   const fetchData = async () => {
//     setIsLoading(true);
//     setErrorMessage(null);

//     try {
//       const authData = await getAuthData();

//       // --------------------------------------------------------
//       // 1.1 Lấy thông tin shipper
//       // --------------------------------------------------------

//       const resShipper = await fetchWithAuth(
//         `${BASE_URL}/api/shippers/${authData.shipperId}`,
//         {
//           method: "GET",
//         },
//       );

//       if (!resShipper.ok) {
//         throw new Error(`Lỗi tải thông tin shipper (${resShipper.status})`);
//       }

//       const shipperResult: ApiResponse<Shipper> = await resShipper.json();

//       if (!shipperResult.success) {
//         throw new Error(
//           shipperResult.message || "Không thể tải thông tin shipper.",
//         );
//       }

//       const onlineState = shipperResult.data.status_id === STATUS_ONLINE_ID;

//       setIsOnline(onlineState);

//       // --------------------------------------------------------
//       // 1.2 Lấy danh sách đơn hàng
//       // --------------------------------------------------------

//       const resOrders = await fetchWithAuth(`${BASE_URL}/api/orders`, {
//         method: "GET",
//       });

//       if (!resOrders.ok) {
//         throw new Error(`Lỗi tải danh sách đơn hàng (${resOrders.status})`);
//       }

//       const ordersResult: ApiResponse<Order[]> = await resOrders.json();

//       if (!ordersResult.success) {
//         throw new Error(
//           ordersResult.message || "Không thể tải danh sách đơn hàng.",
//         );
//       }

//       setOrders(ordersResult.data || []);
//     } catch (error: unknown) {
//       const message = getErrorMessage(error);

//       setErrorMessage(message);

//       // Nếu lỗi xác thực thì không hiện Alert thêm
//       if (!message.includes("đăng nhập") && !message.includes("Phiên")) {
//         console.log("Home fetch error:", message);
//       }
//     } finally {
//       setIsLoading(false);
//     }
//   };

//   // ============================================================
//   // KHI VÀO HOME
//   // ============================================================

//   useEffect(() => {
//     fetchData();
//   }, []);

//   // ============================================================
//   // 2. CHUYỂN ONLINE / OFFLINE
//   // ============================================================

//   const toggleSwitch = async () => {
//     if (!shipperId) {
//       Alert.alert("Lỗi", "Không tìm thấy thông tin shipper.");
//       return;
//     }

//     const nextState = !isOnline;

//     const newStatusId = nextState ? STATUS_ONLINE_ID : STATUS_OFFLINE_ID;

//     setIsUpdating(true);

//     try {
//       const response = await fetchWithAuth(
//         `${BASE_URL}/api/shippers/${shipperId}`,
//         {
//           method: "PUT",
//           body: JSON.stringify({
//             status_id: newStatusId,
//           }),
//         },
//       );

//       if (!response.ok) {
//         throw new Error(`Không thể cập nhật trạng thái (${response.status})`);
//       }

//       const result: ApiResponse<Shipper> = await response.json();

//       if (!result.success) {
//         throw new Error(result.message || "Cập nhật thất bại.");
//       }

//       setIsOnline(nextState);
//     } catch (error: unknown) {
//       Alert.alert("Thất bại", getErrorMessage(error));
//     } finally {
//       setIsUpdating(false);
//     }
//   };

//   // ============================================================
//   // 3. CHẤP NHẬN ĐƠN HÀNG
//   // ============================================================

//   const handleAcceptOrder = async (orderId: number) => {
//     if (!shipperId) {
//       Alert.alert("Lỗi", "Không tìm thấy thông tin shipper.");
//       return;
//     }

//     setProcessingOrderId(orderId);

//     try {
//       // --------------------------------------------------------
//       // B1. Tạo Delivery
//       // --------------------------------------------------------

//       const deliveryResponse = await fetchWithAuth(
//         `${BASE_URL}/api/deliveries`,
//         {
//           method: "POST",
//           body: JSON.stringify({
//             order_id: orderId,
//             shipper_id: shipperId,
//             status: "ACCEPTED",
//           }),
//         },
//       );

//       if (!deliveryResponse.ok) {
//         const errorText = await deliveryResponse.text();

//         throw new Error(errorText || "Không thể tạo đơn giao hàng.");
//       }

//       const deliveryResult = await deliveryResponse.json();

//       if (deliveryResult.success === false) {
//         throw new Error(
//           deliveryResult.message || "Không thể tạo đơn giao hàng.",
//         );
//       }

//       // --------------------------------------------------------
//       // B2. Cập nhật trạng thái Order
//       // --------------------------------------------------------

//       const orderUpdateResponse = await fetchWithAuth(
//         `${BASE_URL}/api/orders/${orderId}`,
//         {
//           method: "PUT",
//           body: JSON.stringify({
//             status_id: ORDER_STATUS_ACCEPTED,
//           }),
//         },
//       );

//       if (!orderUpdateResponse.ok) {
//         const errorText = await orderUpdateResponse.text();

//         throw new Error(errorText || "Không thể cập nhật trạng thái đơn hàng.");
//       }

//       const orderResult = await orderUpdateResponse.json();

//       if (orderResult.success === false) {
//         throw new Error(orderResult.message || "Cập nhật đơn hàng thất bại.");
//       }

//       Alert.alert("Thành công", `Đã nhận đơn hàng #${orderId}`);

//       // --------------------------------------------------------
//       // B3. Xóa đơn khỏi danh sách
//       // --------------------------------------------------------

//       setOrders((prev) => prev.filter((item) => item.order_id !== orderId));
//     } catch (error: unknown) {
//       Alert.alert("Lỗi", getErrorMessage(error));
//     } finally {
//       setProcessingOrderId(null);
//     }
//   };

//   // ============================================================
//   // 4. HIỂN THỊ ĐƠN HÀNG
//   // ============================================================

//   const renderOrderItem = ({ item }: { item: Order }) => (
//     <View style={styles.card}>
//       <View style={styles.cardHeader}>
//         <Text style={styles.orderId}>Đơn hàng #{item.order_id}</Text>

//         <Text style={styles.feeText}>
//           {(item.total_amount || 0).toLocaleString("vi-VN")}đ
//         </Text>
//       </View>

//       <View style={styles.divider} />

//       <View style={styles.addressContainer}>
//         <Text style={styles.label}>Lấy hàng tại:</Text>

//         <Text style={styles.restaurantName}>
//           {item.restaurant_name || "Cửa hàng"}
//         </Text>

//         <Text style={styles.addressText}>
//           {item.pickup_address || "Chưa có địa chỉ"}
//         </Text>
//       </View>

//       <View style={styles.addressContainer}>
//         <Text style={styles.label}>Giao đến:</Text>

//         <Text style={styles.addressText}>
//           {item.delivery_address || "Chưa có địa chỉ"}
//         </Text>
//       </View>

//       <TouchableOpacity
//         style={[
//           styles.acceptButton,
//           (!isOnline || processingOrderId === item.order_id) &&
//             styles.disabledButton,
//         ]}
//         disabled={!isOnline || processingOrderId === item.order_id}
//         onPress={() => handleAcceptOrder(item.order_id)}
//       >
//         {processingOrderId === item.order_id ? (
//           <ActivityIndicator color="#FFF" size="small" />
//         ) : (
//           <Text style={styles.acceptButtonText}>
//             {isOnline ? "CHẤP NHẬN ĐƠN" : "TẮT HOẠT ĐỘNG"}
//           </Text>
//         )}
//       </TouchableOpacity>
//     </View>
//   );

//   // ============================================================
//   // 5. GIAO DIỆN
//   // ============================================================

//   return (
//     <SafeAreaView style={styles.container}>
//       {/* HEADER */}
//       <View style={styles.header}>
//         <View>
//           <Text style={styles.headerTitle}>SHIPPER APP</Text>

//           {shipperId && (
//             <Text style={styles.shipperIdText}>Shipper #{shipperId}</Text>
//           )}
//         </View>

//         <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
//           <Text style={styles.logoutText}>Đăng xuất</Text>
//         </TouchableOpacity>
//       </View>

//       {/* TRẠNG THÁI */}
//       <View style={styles.statusContainer}>
//         <Text style={styles.statusText}>
//           Trạng thái:{" "}
//           <Text
//             style={{
//               color: isOnline ? "#4CAF50" : "#F44336",
//               fontWeight: "bold",
//             }}
//           >
//             {isOnline ? "ONLINE (Sẵn sàng nhận đơn)" : "OFFLINE (Đã tắt)"}
//           </Text>
//         </Text>

//         {isUpdating ? (
//           <ActivityIndicator size="small" color="#FF5722" />
//         ) : (
//           <Switch
//             trackColor={{
//               false: "#767577",
//               true: "#81c784",
//             }}
//             thumbColor={isOnline ? "#4CAF50" : "#f4f3f4"}
//             onValueChange={toggleSwitch}
//             value={isOnline}
//             disabled={isLoading}
//           />
//         )}
//       </View>

//       {/* CONTENT */}
//       {isLoading ? (
//         <View style={styles.centerContent}>
//           <ActivityIndicator size="large" color="#FF5722" />

//           <Text style={styles.loadingText}>Đang tải thông tin...</Text>
//         </View>
//       ) : errorMessage ? (
//         <View style={styles.centerContent}>
//           <Text style={styles.errorText}>{errorMessage}</Text>

//           <TouchableOpacity style={styles.retryButton} onPress={fetchData}>
//             <Text style={styles.retryText}>Thử lại</Text>
//           </TouchableOpacity>
//         </View>
//       ) : isOnline ? (
//         <FlatList
//           data={orders}
//           keyExtractor={(item) => item.order_id.toString()}
//           renderItem={renderOrderItem}
//           contentContainerStyle={styles.listContainer}
//           onRefresh={fetchData}
//           refreshing={isLoading}
//           ListEmptyComponent={
//             <View style={styles.emptyContainer}>
//               <Text style={styles.emptyText}>Hiện chưa có đơn hàng nào!</Text>
//             </View>
//           }
//         />
//       ) : (
//         <View style={styles.offlineView}>
//           <Text style={styles.offlineText}>
//             Bạn đang ở trạng thái OFFLINE.
//             {"\n\n"}
//             Hãy bật công tắc để bắt đầu nhận đơn!
//           </Text>
//         </View>
//       )}
//     </SafeAreaView>
//   );
// }

// // ============================================================
// // STYLE
// // ============================================================

// const styles = StyleSheet.create({
//   container: {
//     flex: 1,
//     backgroundColor: "#F5F5F5",
//   },

//   header: {
//     flexDirection: "row",
//     justifyContent: "space-between",
//     alignItems: "center",
//     backgroundColor: "#FF5722",
//     paddingHorizontal: 16,
//     paddingVertical: 14,
//   },

//   headerTitle: {
//     color: "#FFF",
//     fontSize: 18,
//     fontWeight: "bold",
//   },

//   shipperIdText: {
//     color: "#FFF",
//     fontSize: 12,
//     marginTop: 2,
//   },

//   logoutButton: {
//     backgroundColor: "#FFF",
//     paddingHorizontal: 12,
//     paddingVertical: 8,
//     borderRadius: 6,
//   },

//   logoutText: {
//     color: "#FF5722",
//     fontWeight: "bold",
//     fontSize: 13,
//   },

//   statusContainer: {
//     flexDirection: "row",
//     justifyContent: "space-between",
//     alignItems: "center",
//     backgroundColor: "#FFF",
//     padding: 16,
//     borderBottomWidth: 1,
//     borderBottomColor: "#E0E0E0",
//   },

//   statusText: {
//     fontSize: 15,
//   },

//   listContainer: {
//     padding: 16,
//   },

//   card: {
//     backgroundColor: "#FFF",
//     borderRadius: 8,
//     padding: 16,
//     marginBottom: 16,
//     boxShadow: "0px 1px 3px rgba(0, 0, 0, 0.2)",
//   },

//   cardHeader: {
//     flexDirection: "row",
//     justifyContent: "space-between",
//     alignItems: "center",
//   },

//   orderId: {
//     fontSize: 16,
//     fontWeight: "bold",
//   },

//   feeText: {
//     fontSize: 18,
//     fontWeight: "bold",
//     color: "#FF5722",
//   },

//   divider: {
//     height: 1,
//     backgroundColor: "#EEEEEE",
//     marginVertical: 12,
//   },

//   addressContainer: {
//     marginBottom: 10,
//   },

//   label: {
//     fontSize: 12,
//     color: "#757575",
//     marginBottom: 2,
//   },

//   restaurantName: {
//     fontSize: 14,
//     fontWeight: "600",
//     color: "#212121",
//   },

//   addressText: {
//     fontSize: 14,
//     color: "#424242",
//   },

//   acceptButton: {
//     backgroundColor: "#FF5722",
//     paddingVertical: 12,
//     borderRadius: 6,
//     alignItems: "center",
//     marginTop: 8,
//   },

//   disabledButton: {
//     backgroundColor: "#BDBDBD",
//   },

//   acceptButtonText: {
//     color: "#FFF",
//     fontWeight: "bold",
//     fontSize: 15,
//   },

//   offlineView: {
//     flex: 1,
//     justifyContent: "center",
//     alignItems: "center",
//     padding: 32,
//   },

//   offlineText: {
//     textAlign: "center",
//     color: "#757575",
//     fontSize: 16,
//   },

//   centerContent: {
//     flex: 1,
//     justifyContent: "center",
//     alignItems: "center",
//     padding: 24,
//   },

//   loadingText: {
//     marginTop: 12,
//     color: "#757575",
//   },

//   errorText: {
//     color: "#F44336",
//     fontSize: 15,
//     textAlign: "center",
//   },

//   retryButton: {
//     marginTop: 12,
//     padding: 10,
//     backgroundColor: "#FF5722",
//     borderRadius: 6,
//   },

//   retryText: {
//     color: "#FFF",
//     fontWeight: "bold",
//   },

//   emptyContainer: {
//     alignItems: "center",
//     marginTop: 40,
//   },

//   emptyText: {
//     fontSize: 16,
//     color: "#757575",
//   },
// });
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { API_BASE_URL } from "../constants/api";
import {
  ActivityIndicator,
  Alert,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

// ======================================================
// STATUS CONSTANTS
// ======================================================

const STATUS_OFFLINE_ID = 1;
const STATUS_ONLINE_ID = 2;
const STATUS_BUSY_ID = 3;

const ORDER_STATUS_READY_FOR_PICKUP = 4;

// ======================================================
// TYPES
// ======================================================

type Shipper = {
  shipper_id: number;
  user_id: number;
  full_name?: string;
  phone?: string;
  status_id: number;
};

type Order = {
  order_id: number;

  order_code?: string;

  customer_id?: number;
  restaurant_id?: number;
  address_id?: number;

  restaurant_name?: string;
  restaurant_phone?: string;
  restaurant_address?: string;

  pickup_address?: string;
  delivery_address?: string;

  receiver_name?: string;
  receiver_phone?: string;

  subtotal?: number;
  delivery_fee?: number;
  discount?: number;
  total_amount?: number;

  status_id?: number;

  note?: string;

  delivery_id: number;
  shipper_id?: number | null;
  delivery_status?: string;

  created_at?: string;
  updated_at?: string;
};

type ApiResponse<T> = {
  success: boolean;
  message?: string;
  data: T;
};

// ======================================================
// HOME SCREEN
// ======================================================

export default function HomeScreen() {
  const router = useRouter();

  // ====================================================
  // STATE
  // ====================================================

  const [shipperId, setShipperId] = useState<number | null>(null);

  const [shipper, setShipper] = useState<Shipper | null>(null);

  const [isOnline, setIsOnline] = useState(false);

  const [isBusy, setIsBusy] = useState(false);

  const [isLoading, setIsLoading] = useState(true);

  const [isRefreshing, setIsRefreshing] = useState(false);

  const [isUpdating, setIsUpdating] = useState(false);

  const [errorMessage, setErrorMessage] = useState("");

  const [orders, setOrders] = useState<Order[]>([]);

  const [processingOrderId, setProcessingOrderId] = useState<number | null>(
    null,
  );

  // ====================================================
  // GET AUTH DATA
  // ====================================================

  const getAuthData = useCallback(async (): Promise<number | null> => {
    try {
      const token = await AsyncStorage.getItem("token");

      const savedShipperId = await AsyncStorage.getItem("shipperId");

      // Không có token
      if (!token) {
        console.log("Không tìm thấy token.");

        setShipper(null);
        setShipperId(null);

        router.replace("/LoginScreen");

        return null;
      }

      // Không có shipperId
      if (!savedShipperId) {
        console.log("Không tìm thấy shipperId.");

        await AsyncStorage.multiRemove(["token", "shipperId", "shipperInfo"]);

        setShipper(null);
        setShipperId(null);

        router.replace("/LoginScreen");

        return null;
      }

      const parsedShipperId = Number(savedShipperId);

      // shipperId không hợp lệ
      if (!Number.isInteger(parsedShipperId) || parsedShipperId <= 0) {
        console.log("shipperId không hợp lệ:", savedShipperId);

        await AsyncStorage.multiRemove(["token", "shipperId", "shipperInfo"]);

        setShipper(null);
        setShipperId(null);

        router.replace("/LoginScreen");

        return null;
      }

      // Cập nhật shipperId mới vào state
      setShipperId(parsedShipperId);

      return parsedShipperId;
    } catch (error) {
      console.error("Lỗi getAuthData:", error);

      await AsyncStorage.multiRemove(["token", "shipperId", "shipperInfo"]);

      setShipper(null);
      setShipperId(null);

      router.replace("/LoginScreen");

      return null;
    }
  }, [router]);

  // ====================================================
  // FETCH WITH AUTH
  // ====================================================

  const fetchWithAuth = useCallback(
    async (url: string, options: RequestInit = {}): Promise<Response> => {
      const token = await AsyncStorage.getItem("token");

      if (!token) {
        await AsyncStorage.multiRemove(["token", "shipperId", "shipperInfo"]);

        setShipper(null);
        setShipperId(null);

        router.replace("/LoginScreen");

        throw new Error("Phiên đăng nhập đã hết.");
      }

      const response = await fetch(url, {
        ...options,
        headers: {
          ...(options.headers || {}),
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      // Token hết hạn
      if (response.status === 401) {
        console.log("Token hết hạn.");

        await AsyncStorage.multiRemove(["token", "shipperId", "shipperInfo"]);

        setShipper(null);
        setShipperId(null);

        if (Platform.OS === "web") {
          window.alert("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.");
        } else {
          Alert.alert(
            "Phiên đăng nhập",
            "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.",
          );
        }

        router.replace("/LoginScreen");

        throw new Error("UNAUTHORIZED");
      }

      return response;
    },
    [router],
  );

  // ====================================================
  // FETCH SHIPPER
  // ====================================================

  const fetchShipper = useCallback(
    async (currentShipperId: number): Promise<Shipper | null> => {
      try {
        console.log("Đang lấy thông tin shipper:", currentShipperId);

        const response = await fetchWithAuth(
          `${API_BASE_URL}/api/shippers/${currentShipperId}`,
        );

        const result: ApiResponse<Shipper> = await response.json();

        console.log("Shipper API:", result);

        if (!response.ok || !result.success) {
          throw new Error(result.message || "Không thể lấy thông tin shipper.");
        }

        // ==============================================
        // CẬP NHẬT STATE SHIPPER MỚI
        // ==============================================

        setShipper(result.data);

        setIsOnline(result.data.status_id === STATUS_ONLINE_ID);

        setIsBusy(result.data.status_id === STATUS_BUSY_ID);

        // ==============================================
        // CẬP NHẬT LẠI ASYNC STORAGE
        // ==============================================

        await AsyncStorage.setItem("shipperInfo", JSON.stringify(result.data));

        console.log("Đã cập nhật thông tin shipper:", result.data.full_name);
        return result.data;
      } catch (error) {
        console.error("Lỗi fetchShipper:", error);

        if (error instanceof Error && error.message === "UNAUTHORIZED") {
          return null;
        }

        throw error;
      }
    },
    [fetchWithAuth],
  );

  // ====================================================
  // FETCH AVAILABLE ORDERS
  // ====================================================

  const fetchOrders = useCallback(async (): Promise<void> => {
    try {
      console.log("Đang lấy danh sách đơn hàng...");

      const response = await fetchWithAuth(
        `${API_BASE_URL}/api/deliveries/available`,
      );

      const result: ApiResponse<Order[]> = await response.json();

      console.log("Orders API:", result);

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Không thể lấy danh sách đơn hàng.");
      }

      setOrders(result.data || []);
    } catch (error) {
      console.error("Lỗi fetchOrders:", error);

      if (error instanceof Error && error.message === "UNAUTHORIZED") {
        return;
      }

      throw error;
    }
  }, [fetchWithAuth]);

  // ====================================================
  // FETCH ALL DATA
  // ====================================================

  const fetchData = useCallback(
    async (showLoading: boolean = true): Promise<void> => {
      try {
        if (showLoading) {
          setIsLoading(true);
        }

        setErrorMessage("");

        console.log("==============================");
        console.log("BẮT ĐẦU TẢI DỮ LIỆU HOME");
        console.log("==============================");

        // ==============================================
        // LẤY SHIPPER ID HIỆN TẠI
        // ==============================================

        const currentShipperId = await getAuthData();

        if (!currentShipperId) {
          return;
        }

        console.log("Shipper ID hiện tại:", currentShipperId);

        // ==============================================
        // LẤY THÔNG TIN SHIPPER MỚI
        // ==============================================

        const currentShipper = await fetchShipper(currentShipperId);
        if (!currentShipper) {
          return;
        }

        // ==============================================
        // LẤY ĐƠN HÀNG CÓ THỂ NHẬN
        // ==============================================

        if (currentShipper.status_id === STATUS_ONLINE_ID) {
          await fetchOrders();
        } else {
          setOrders([]);
        }

        console.log("==============================");
        console.log("TẢI DỮ LIỆU HOME THÀNH CÔNG");
        console.log("==============================");
      } catch (error) {
        console.error("Lỗi fetchData:", error);

        if (error instanceof Error && error.message === "UNAUTHORIZED") {
          return;
        }

        const message =
          error instanceof Error ? error.message : "Không thể tải dữ liệu.";

        setErrorMessage(message);
      } finally {
        if (showLoading) {
          setIsLoading(false);
        }
      }
    },
    [fetchOrders, fetchShipper, getAuthData],
  );

  // ====================================================
  // TỰ ĐỘNG LOAD LẠI KHI HOME ĐƯỢC FOCUS
  // ====================================================

  useFocusEffect(
    useCallback(() => {
      let isActive = true;

      const reloadHome = async () => {
        if (!isActive) {
          return;
        }

        console.log("HOME ĐƯỢC FOCUS -> TẢI LẠI THÔNG TIN");

        await fetchData(true);
      };

      reloadHome();

      return () => {
        isActive = false;
      };
    }, [fetchData]),
  );

  // ====================================================
  // REFRESH
  // ====================================================

  const handleRefresh = async () => {
    try {
      setIsRefreshing(true);

      await fetchData(false);
    } finally {
      setIsRefreshing(false);
    }
  };

  // ====================================================
  // TOGGLE ONLINE / OFFLINE
  // ====================================================

  const toggleOnlineStatus = async (value: boolean) => {
    if (!shipperId || isUpdating) {
      return;
    }

    try {
      setIsUpdating(true);

      const newStatusId = value ? STATUS_ONLINE_ID : STATUS_OFFLINE_ID;

      const response = await fetchWithAuth(
        `${API_BASE_URL}/api/deliveries/me/status`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            status: value ? "ONLINE" : "OFFLINE",
          }),
        },
      );

      const result: ApiResponse<{ status: string }> = await response.json();

      console.log("KẾT QUẢ UPDATE STATUS:", result);

      if (!response.ok || !result.success) {
        throw new Error(
          result.message || "Không thể cập nhật trạng thái shipper",
        );
      }

      const expectedStatus = value ? "ONLINE" : "OFFLINE";
      if (result.data?.status !== expectedStatus) {
        throw new Error("Backend trả về trạng thái Shipper không hợp lệ.");
      }

      // Cập nhật trạng thái Online / Offline trên giao diện
      setIsOnline(value);

      // Cập nhật trạng thái shipper đã lưu cục bộ.
      const updatedShipper = shipper
        ? { ...shipper, status_id: newStatusId }
        : null;
      setShipper(updatedShipper);
      if (updatedShipper) {
        await AsyncStorage.setItem(
          "shipperInfo",
          JSON.stringify(updatedShipper),
        );
      }

      Alert.alert(
        "Thành công",
        value
          ? "Bạn đã chuyển sang trạng thái Online"
          : "Bạn đã chuyển sang trạng thái Offline",
      );
    } catch (error) {
      console.error("Lỗi toggleOnlineStatus:", error);

      Alert.alert(
        "Lỗi",
        error instanceof Error
          ? error.message
          : "Không thể thay đổi trạng thái",
      );
    } finally {
      setIsUpdating(false);
    }
  };
  // ====================================================
  // ACCEPT ORDER
  // ====================================================

  const acceptOrder = async (
    deliveryId: number,
    orderId: number,
  ): Promise<void> => {
    if (!shipperId) {
      if (Platform.OS === "web") {
        window.alert("Không tìm thấy thông tin Shipper.");
      } else {
        Alert.alert("Thông báo", "Không tìm thấy thông tin Shipper.");
      }

      return;
    }

    // ==============================================
    // PHẢI ONLINE
    // ==============================================

    if (!isOnline) {
      if (Platform.OS === "web") {
        window.alert(
          "Bạn cần chuyển sang trạng thái Online trước khi nhận đơn.",
        );
      } else {
        Alert.alert(
          "Chưa Online",
          "Bạn cần chuyển sang trạng thái Online trước khi nhận đơn.",
        );
      }

      return;
    }

    // ==============================================
    // KHÔNG ĐƯỢC NHẬN ĐƠN KHI ĐANG BUSY
    // ==============================================

    if (isBusy) {
      if (Platform.OS === "web") {
        window.alert("Bạn đang có đơn hàng đang giao.");
      } else {
        Alert.alert("Đang giao hàng", "Bạn đang có đơn hàng đang giao.");
      }

      return;
    }

    try {
      setProcessingOrderId(orderId);

      console.log("Đang nhận đơn:", orderId);

      const response = await fetchWithAuth(
        `${API_BASE_URL}/api/deliveries/${deliveryId}/accept`,
        {
          method: "POST",
        },
      );

      const result: ApiResponse<unknown> = await response.json();

      console.log("Accept order API:", result);

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Không thể nhận đơn hàng.");
      }

      // ==============================================
      // XÓA ĐƠN VỪA NHẬN KHỎI DANH SÁCH
      // ==============================================

      setOrders((currentOrders) =>
        currentOrders.filter((order) => order.order_id !== orderId),
      );

      // ==============================================
      // SHIPPER -> BUSY
      // ==============================================

      setIsBusy(true);
      setIsOnline(false);

      // ==============================================
      // CẬP NHẬT THÔNG TIN SHIPPER
      // ==============================================

      if (shipper) {
        const updatedShipper: Shipper = {
          ...shipper,
          status_id: STATUS_BUSY_ID,
        };

        setShipper(updatedShipper);

        await AsyncStorage.setItem(
          "shipperInfo",
          JSON.stringify(updatedShipper),
        );
      }

      // ==============================================
      // CHUYỂN SANG TRANG GIAO HÀNG
      // ==============================================

      router.push("/giaohang");
    } catch (error) {
      console.error("Lỗi acceptOrder:", error);

      const message =
        error instanceof Error ? error.message : "Không thể nhận đơn hàng.";

      if (Platform.OS === "web") {
        window.alert(message);
      } else {
        Alert.alert("Không thể nhận đơn", message);
      }
    } finally {
      setProcessingOrderId(null);
    }
  };

  // ====================================================
  // LOGOUT
  // ====================================================

  const handleLogout = async () => {
    const logout = async () => {
      try {
        console.log("=================================");
        console.log("ĐANG ĐĂNG XUẤT");
        console.log("=================================");

        // ==========================================
        // XÓA DỮ LIỆU ĐĂNG NHẬP
        // ==========================================

        await AsyncStorage.multiRemove(["token", "shipperId", "shipperInfo"]);

        // ==========================================
        // XÓA STATE TÀI KHOẢN CŨ
        // ==========================================

        setShipper(null);
        setShipperId(null);

        setOrders([]);

        setIsOnline(false);
        setIsBusy(false);

        setErrorMessage("");

        console.log("Đã xóa token, shipperId, shipperInfo");

        // ==========================================
        // CHUYỂN VỀ LOGIN
        // ==========================================

        router.replace("/LoginScreen");
      } catch (error) {
        console.error("Logout error:", error);

        if (Platform.OS === "web") {
          window.alert("Đăng xuất thất bại. Vui lòng thử lại!");
        } else {
          Alert.alert("Lỗi", "Đăng xuất thất bại. Vui lòng thử lại!");
        }
      }
    };

    // ==============================================
    // WEB
    // ==============================================

    if (Platform.OS === "web") {
      const confirmed = window.confirm(
        "Bạn có chắc chắn muốn đăng xuất không?",
      );

      if (!confirmed) {
        return;
      }

      await logout();

      return;
    }

    // ==============================================
    // ANDROID / IOS
    // ==============================================

    Alert.alert("Đăng xuất", "Bạn có chắc chắn muốn đăng xuất không?", [
      {
        text: "Hủy",
        style: "cancel",
      },
      {
        text: "Đăng xuất",
        style: "destructive",
        onPress: logout,
      },
    ]);
  };

  // ====================================================
  // FORMAT MONEY
  // ====================================================

  const formatMoney = (value?: number): string => {
    if (value === undefined || value === null) {
      return "0 ₫";
    }

    return `${Number(value).toLocaleString("vi-VN")} ₫`;
  };

  // ====================================================
  // GET ORDER STATUS
  // ====================================================

  const getOrderStatusText = (statusId?: number): string => {
    switch (statusId) {
      case ORDER_STATUS_READY_FOR_PICKUP:
        return "Chờ lấy hàng";

      default:
        return "Chờ lấy hàng";
    }
  };

  // ====================================================
  // LOADING
  // ====================================================

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FF5722" />

        <Text style={styles.loadingText}>Đang tải thông tin...</Text>
      </View>
    );
  }

  // ====================================================
  // UI
  // ====================================================

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
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
        {/* ==========================================
            HEADER
        ========================================== */}

        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.headerTitle}>SHIPPER APP</Text>

            <Text style={styles.headerSubtitle}>
              Xin chào, {shipper?.full_name || "Shipper"}
            </Text>
          </View>

          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Text style={styles.logoutText}>Đăng xuất</Text>
          </TouchableOpacity>
        </View>

        {/* ==========================================
            ERROR
        ========================================== */}

        {errorMessage ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{errorMessage}</Text>

            <TouchableOpacity
              style={styles.retryButton}
              onPress={() => fetchData(true)}
            >
              <Text style={styles.retryText}>Thử lại</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {/* ==========================================
            SHIPPER INFO
        ========================================== */}

        <View style={styles.profileCard}>
          <View style={styles.profileTop}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {shipper?.full_name
                  ? shipper.full_name.charAt(0).toUpperCase()
                  : "S"}
              </Text>
            </View>

            <View style={styles.profileInfo}>
              <Text style={styles.profileName}>
                {shipper?.full_name || "Shipper"}
              </Text>

              <Text style={styles.profilePhone}>
                {shipper?.phone || "Chưa cập nhật số điện thoại"}
              </Text>
            </View>
          </View>

          {/* ========================================
              ONLINE SWITCH
          ======================================== */}

          <View style={styles.statusRow}>
            <View>
              <Text style={styles.statusTitle}>Trạng thái hoạt động</Text>

              <Text
                style={[
                  styles.statusText,
                  isBusy
                    ? styles.busyText
                    : isOnline
                      ? styles.onlineText
                      : styles.offlineText,
                ]}
              >
                {isBusy
                  ? "ĐANG GIAO HÀNG"
                  : isOnline
                    ? "ĐANG ONLINE"
                    : "ĐANG OFFLINE"}
              </Text>
            </View>

            <Switch
              value={isOnline}
              onValueChange={toggleOnlineStatus}
              disabled={isUpdating || isBusy}
              trackColor={{
                false: "#D0D0D0",
                true: "#FFAB91",
              }}
              thumbColor={isOnline ? "#FF5722" : "#F4F4F4"}
            />
          </View>
        </View>

        {/* ==========================================
            STATUS INFORMATION
        ========================================== */}

        <View style={styles.statusCard}>
          <View style={styles.statusIndicator}>
            <View
              style={[
                styles.statusDot,
                isBusy
                  ? styles.statusDotBusy
                  : isOnline
                    ? styles.statusDotOnline
                    : styles.statusDotOffline,
              ]}
            />

            <View>
              <Text style={styles.statusCardTitle}>
                {isBusy
                  ? "Bạn đang giao hàng"
                  : isOnline
                    ? "Bạn đang sẵn sàng"
                    : "Bạn đang nghỉ"}
              </Text>

              <Text style={styles.statusCardText}>
                {isBusy
                  ? "Hoàn thành đơn hiện tại trước khi nhận đơn mới."
                  : isOnline
                    ? "Các đơn hàng mới sẽ hiển thị bên dưới."
                    : "Bật Online để bắt đầu nhận đơn hàng."}
              </Text>
            </View>
          </View>
        </View>

        {/* ==========================================
            ORDER HEADER
        ========================================== */}

        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.sectionTitle}>Đơn hàng có thể nhận</Text>

            <Text style={styles.sectionSubtitle}>{orders.length} đơn hàng</Text>
          </View>

          <TouchableOpacity
            style={styles.refreshButton}
            onPress={handleRefresh}
            disabled={isRefreshing}
          >
            <Text style={styles.refreshButtonText}>Làm mới</Text>
          </TouchableOpacity>
        </View>

        {/* ==========================================
            NO ORDER
        ========================================== */}

        {orders.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyIcon}>🚚</Text>

            <Text style={styles.emptyTitle}>Chưa có đơn hàng</Text>

            <Text style={styles.emptyText}>
              Hiện tại chưa có đơn hàng nào đang chờ shipper nhận.
            </Text>

            {!isOnline && !isBusy ? (
              <Text style={styles.emptyHint}>
                Hãy bật trạng thái Online để sẵn sàng nhận đơn.
              </Text>
            ) : null}
          </View>
        ) : (
          /* ========================================
             ORDER LIST
          ======================================== */

          <View style={styles.orderList}>
            {orders.map((order) => {
              const isProcessing = processingOrderId === order.order_id;

              return (
                <View key={order.order_id} style={styles.orderCard}>
                  {/* ORDER HEADER */}

                  <View style={styles.orderHeader}>
                    <View>
                      <Text style={styles.orderCode}>
                        {order.order_code || `Đơn #${order.order_id}`}
                      </Text>

                      <Text style={styles.orderStatus}>
                        {getOrderStatusText(order.status_id)}
                      </Text>
                    </View>

                    {order.total_amount != null ? (
                      <Text style={styles.orderTotal}>
                        {formatMoney(order.total_amount)}
                      </Text>
                    ) : null}
                  </View>

                  {/* RESTAURANT */}

                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Nhà hàng</Text>

                    <Text style={styles.infoValue}>
                      {order.restaurant_name || "Chưa cập nhật"}
                    </Text>
                  </View>

                  {/* RESTAURANT PHONE */}

                  {order.restaurant_phone ? (
                    <View style={styles.infoRow}>
                      <Text style={styles.infoLabel}>SĐT nhà hàng</Text>

                      <Text style={styles.infoValue}>
                        {order.restaurant_phone}
                      </Text>
                    </View>
                  ) : null}

                  {/* PICKUP ADDRESS */}

                  <View style={styles.addressBox}>
                    <Text style={styles.addressTitle}>📍 Địa chỉ lấy hàng</Text>

                    <Text style={styles.addressText}>
                      {order.restaurant_address || "Chưa có địa chỉ lấy hàng"}
                    </Text>
                  </View>

                  {/* DELIVERY ADDRESS */}

                  <View style={[styles.addressBox, styles.deliveryAddressBox]}>
                    <Text style={styles.addressTitle}>
                      🏠 Địa chỉ giao hàng
                    </Text>

                    <Text style={styles.addressText}>
                      {order.delivery_address || "Chưa có địa chỉ giao hàng"}
                    </Text>
                  </View>

                  {/* RECEIVER */}

                  {order.receiver_name ? (
                    <View style={styles.infoRow}>
                      <Text style={styles.infoLabel}>Người nhận</Text>

                      <Text style={styles.infoValue}>
                        {order.receiver_name}
                      </Text>
                    </View>
                  ) : null}

                  {/* RECEIVER PHONE */}

                  {order.receiver_phone ? (
                    <View style={styles.infoRow}>
                      <Text style={styles.infoLabel}>SĐT người nhận</Text>

                      <Text style={styles.infoValue}>
                        {order.receiver_phone}
                      </Text>
                    </View>
                  ) : null}

                  {/* NOTE */}

                  {order.note ? (
                    <View style={styles.noteBox}>
                      <Text style={styles.noteTitle}>Ghi chú</Text>

                      <Text style={styles.noteText}>{order.note}</Text>
                    </View>
                  ) : null}

                  {/* ORDER PRICE */}

                  {order.subtotal != null ||
                  order.delivery_fee != null ||
                  order.total_amount != null ? (
                    <View style={styles.priceContainer}>
                      <View style={styles.priceRow}>
                        <Text style={styles.priceLabel}>Tạm tính</Text>

                        <Text style={styles.priceValue}>
                          {formatMoney(order.subtotal)}
                        </Text>
                      </View>

                      <View style={styles.priceRow}>
                        <Text style={styles.priceLabel}>Phí giao hàng</Text>

                        <Text style={styles.priceValue}>
                          {formatMoney(order.delivery_fee)}
                        </Text>
                      </View>

                      {order.discount ? (
                      <View style={styles.priceRow}>
                        <Text style={styles.priceLabel}>Giảm giá</Text>

                        <Text style={[styles.priceValue, styles.discountText]}>
                          - {formatMoney(order.discount)}
                        </Text>
                      </View>
                      ) : null}

                      <View style={[styles.priceRow, styles.totalRow]}>
                        <Text style={styles.totalLabel}>Tổng tiền</Text>

                        <Text style={styles.totalValue}>
                          {formatMoney(order.total_amount)}
                        </Text>
                      </View>
                    </View>
                  ) : null}

                  {/* ACCEPT BUTTON */}

                  <TouchableOpacity
                    style={[
                      styles.acceptButton,
                      (!isOnline || isBusy || isProcessing) &&
                        styles.acceptButtonDisabled,
                    ]}
                    onPress={() => acceptOrder(order.delivery_id, order.order_id)}
                    disabled={!isOnline || isBusy || isProcessing}
                  >
                    {isProcessing ? (
                      <ActivityIndicator color="#FFFFFF" size="small" />
                    ) : (
                      <Text style={styles.acceptButtonText}>
                        {!isOnline
                          ? "BẬT ONLINE ĐỂ NHẬN ĐƠN"
                          : isBusy
                            ? "ĐANG CÓ ĐƠN KHÁC"
                            : "NHẬN ĐƠN HÀNG"}
                      </Text>
                    )}
                  </TouchableOpacity>
                </View>
              );
            })}
          </View>
        )}

        {/* ==========================================
            BOTTOM SPACE
        ========================================== */}

        <View style={styles.bottomSpace} />
      </ScrollView>
    </View>
  );
}

// ======================================================
// STYLES
// ======================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F5F5",
  },

  scrollView: {
    flex: 1,
  },

  scrollContent: {
    paddingBottom: 30,
  },

  // ====================================================
  // LOADING
  // ====================================================

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

  // ====================================================
  // HEADER
  // ====================================================

  header: {
    backgroundColor: "#FF5722",
    paddingHorizontal: 20,
    paddingTop: Platform.OS === "ios" ? 55 : 30,
    paddingBottom: 22,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  headerLeft: {
    flex: 1,
  },

  headerTitle: {
    color: "#FFFFFF",
    fontSize: 23,
    fontWeight: "bold",
  },

  headerSubtitle: {
    color: "#FFFFFF",
    fontSize: 14,
    marginTop: 5,
    opacity: 0.95,
  },

  logoutButton: {
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginLeft: 10,
  },

  logoutText: {
    color: "#FF5722",
    fontSize: 13,
    fontWeight: "bold",
  },

  // ====================================================
  // ERROR
  // ====================================================

  errorBox: {
    margin: 15,
    padding: 14,
    backgroundColor: "#FFEBEE",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#FFCDD2",
  },

  errorText: {
    color: "#C62828",
    fontSize: 14,
    marginBottom: 10,
  },

  retryButton: {
    alignSelf: "flex-start",
    backgroundColor: "#C62828",
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 7,
  },

  retryText: {
    color: "#FFFFFF",
    fontWeight: "bold",
  },

  // ====================================================
  // PROFILE
  // ====================================================

  profileCard: {
    backgroundColor: "#FFFFFF",
    marginHorizontal: 15,
    marginTop: 15,
    borderRadius: 12,
    padding: 18,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.08,
    shadowRadius: 3,
  },

  profileTop: {
    flexDirection: "row",
    alignItems: "center",
  },

  avatar: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: "#FF5722",
    justifyContent: "center",
    alignItems: "center",
  },

  avatarText: {
    color: "#FFFFFF",
    fontSize: 25,
    fontWeight: "bold",
  },

  profileInfo: {
    flex: 1,
    marginLeft: 14,
  },

  profileName: {
    fontSize: 19,
    fontWeight: "bold",
    color: "#222",
  },

  profilePhone: {
    fontSize: 14,
    color: "#777",
    marginTop: 4,
  },

  // ====================================================
  // STATUS
  // ====================================================

  statusRow: {
    borderTopWidth: 1,
    borderTopColor: "#EEEEEE",
    marginTop: 18,
    paddingTop: 15,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  statusTitle: {
    fontSize: 14,
    color: "#555",
  },

  statusText: {
    fontSize: 13,
    fontWeight: "bold",
    marginTop: 4,
  },

  onlineText: {
    color: "#2E7D32",
  },

  offlineText: {
    color: "#757575",
  },

  busyText: {
    color: "#E65100",
  },

  // ====================================================
  // STATUS CARD
  // ====================================================

  statusCard: {
    backgroundColor: "#FFFFFF",
    marginHorizontal: 15,
    marginTop: 12,
    padding: 15,
    borderRadius: 12,
  },

  statusIndicator: {
    flexDirection: "row",
    alignItems: "center",
  },

  statusDot: {
    width: 13,
    height: 13,
    borderRadius: 7,
    marginRight: 12,
  },

  statusDotOnline: {
    backgroundColor: "#4CAF50",
  },

  statusDotOffline: {
    backgroundColor: "#9E9E9E",
  },

  statusDotBusy: {
    backgroundColor: "#FF9800",
  },

  statusCardTitle: {
    fontSize: 15,
    fontWeight: "bold",
    color: "#333",
  },

  statusCardText: {
    fontSize: 13,
    color: "#777",
    marginTop: 4,
    flexShrink: 1,
  },

  // ====================================================
  // SECTION
  // ====================================================

  sectionHeader: {
    marginHorizontal: 15,
    marginTop: 22,
    marginBottom: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  sectionTitle: {
    fontSize: 19,
    fontWeight: "bold",
    color: "#222",
  },

  sectionSubtitle: {
    fontSize: 13,
    color: "#777",
    marginTop: 3,
  },

  refreshButton: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#FF5722",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },

  refreshButtonText: {
    color: "#FF5722",
    fontSize: 13,
    fontWeight: "bold",
  },

  // ====================================================
  // EMPTY
  // ====================================================

  emptyCard: {
    backgroundColor: "#FFFFFF",
    marginHorizontal: 15,
    padding: 30,
    borderRadius: 12,
    alignItems: "center",
  },

  emptyIcon: {
    fontSize: 42,
    marginBottom: 10,
  },

  emptyTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
  },

  emptyText: {
    fontSize: 14,
    color: "#777",
    textAlign: "center",
    marginTop: 7,
    lineHeight: 21,
  },

  emptyHint: {
    fontSize: 13,
    color: "#FF5722",
    textAlign: "center",
    marginTop: 12,
    fontWeight: "600",
  },

  // ====================================================
  // ORDER LIST
  // ====================================================

  orderList: {
    paddingHorizontal: 15,
  },

  orderCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    marginBottom: 14,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.08,
    shadowRadius: 3,
  },

  orderHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingBottom: 13,
    borderBottomWidth: 1,
    borderBottomColor: "#EEEEEE",
  },

  orderCode: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#222",
  },

  orderStatus: {
    fontSize: 12,
    color: "#FF5722",
    fontWeight: "600",
    marginTop: 4,
  },

  orderTotal: {
    fontSize: 17,
    color: "#FF5722",
    fontWeight: "bold",
  },

  // ====================================================
  // INFO
  // ====================================================

  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 8,
  },

  infoLabel: {
    color: "#777",
    fontSize: 13,
    flex: 0.8,
  },

  infoValue: {
    color: "#333",
    fontSize: 13,
    fontWeight: "600",
    flex: 1.2,
    textAlign: "right",
  },

  // ====================================================
  // ADDRESS
  // ====================================================

  addressBox: {
    backgroundColor: "#FFF8F5",
    borderRadius: 8,
    padding: 11,
    marginTop: 7,
    marginBottom: 4,
  },

  deliveryAddressBox: {
    backgroundColor: "#F8F8FF",
  },

  addressTitle: {
    fontSize: 13,
    fontWeight: "bold",
    color: "#444",
    marginBottom: 5,
  },

  addressText: {
    fontSize: 13,
    color: "#555",
    lineHeight: 19,
  },

  // ====================================================
  // NOTE
  // ====================================================

  noteBox: {
    backgroundColor: "#FFFDE7",
    borderRadius: 8,
    padding: 11,
    marginTop: 8,
  },

  noteTitle: {
    fontSize: 13,
    fontWeight: "bold",
    color: "#795548",
    marginBottom: 4,
  },

  noteText: {
    fontSize: 13,
    color: "#665",
    lineHeight: 19,
  },

  // ====================================================
  // PRICE
  // ====================================================

  priceContainer: {
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#EEEEEE",
  },

  priceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 4,
  },

  priceLabel: {
    color: "#777",
    fontSize: 13,
  },

  priceValue: {
    color: "#555",
    fontSize: 13,
  },

  discountText: {
    color: "#2E7D32",
  },

  totalRow: {
    borderTopWidth: 1,
    borderTopColor: "#EEEEEE",
    marginTop: 5,
    paddingTop: 10,
  },

  totalLabel: {
    color: "#222",
    fontSize: 15,
    fontWeight: "bold",
  },

  totalValue: {
    color: "#FF5722",
    fontSize: 17,
    fontWeight: "bold",
  },

  // ====================================================
  // ACCEPT BUTTON
  // ====================================================

  acceptButton: {
    backgroundColor: "#FF5722",
    marginTop: 15,
    paddingVertical: 14,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
  },

  acceptButtonDisabled: {
    backgroundColor: "#BDBDBD",
  },

  acceptButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "bold",
  },

  // ====================================================
  // BOTTOM
  // ====================================================

  bottomSpace: {
    height: 20,
  },
});
