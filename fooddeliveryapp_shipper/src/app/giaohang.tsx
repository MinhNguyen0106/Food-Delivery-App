// import AsyncStorage from "@react-native-async-storage/async-storage";
// import { useRouter } from "expo-router";
// import { useCallback, useEffect, useState } from "react";
// import {
//   ActivityIndicator,
//   Alert,
//   Platform,
//   RefreshControl,
//   ScrollView,
//   StyleSheet,
//   Text,
//   TouchableOpacity,
//   View,
// } from "react-native";

// // ======================================================
// // BASE URL
// // ======================================================

// const BASE_URL =
//   Platform.OS === "web" ? "http://localhost:3000" : "http://192.168.0.106:3000";

// // ======================================================
// // SHIPPER STATUS
// // ======================================================

// const SHIPPER_ONLINE = 2;
// const SHIPPER_BUSY = 3;

// // ======================================================
// // DELIVERY STATUS
// // ======================================================

// const DELIVERY_ACCEPTED = "ACCEPTED";
// const DELIVERY_PICKED_UP = "PICKED_UP";
// const DELIVERY_DELIVERING = "DELIVERING";
// const DELIVERY_COMPLETED = "COMPLETED";

// // ======================================================
// // TYPES
// // ======================================================

// type Delivery = {
//   delivery_id: number;
//   order_id: number;
//   shipper_id: number | null;

//   pickup_time?: string | null;
//   delivery_time?: string | null;

//   delivery_status: string;
//   note?: string | null;

//   order_code?: string;

//   delivery_fee?: number;
//   total_amount?: number;
//   order_status_id?: number;

//   restaurant_id?: number;
//   restaurant_name?: string;
//   pickup_address?: string;
//   restaurant_phone?: string;

//   address_id?: number;
//   receiver_name?: string;
//   receiver_phone?: string;
//   delivery_address?: string;
// };

// type Shipper = {
//   shipper_id: number;
//   user_id: number;
//   full_name?: string;
//   phone?: string;
//   status_id: number;
// };

// type ApiResponse<T> = {
//   success: boolean;
//   message?: string;
//   data?: T;
// };

// // ======================================================
// // COMPONENT
// // ======================================================

// export default function GiaoHangScreen() {
//   const router = useRouter();

//   // ======================================================
//   // STATE
//   // ======================================================

//   const [shipperId, setShipperId] = useState<number | null>(null);

//   const [shipper, setShipper] = useState<Shipper | null>(null);

//   const [delivery, setDelivery] = useState<Delivery | null>(null);

//   const [isLoading, setIsLoading] = useState(true);

//   const [isRefreshing, setIsRefreshing] = useState(false);

//   const [isUpdating, setIsUpdating] = useState(false);

//   // ======================================================
//   // LẤY TOKEN + SHIPPER ID
//   // ======================================================

//   const getAuthData = useCallback(async (): Promise<{
//     token: string;
//     shipperId: number;
//   } | null> => {
//     const token = await AsyncStorage.getItem("token");

//     const storedShipperId = await AsyncStorage.getItem("shipperId");

//     if (!token || !storedShipperId) {
//       return null;
//     }

//     const parsedShipperId = Number(storedShipperId);

//     if (!Number.isInteger(parsedShipperId) || parsedShipperId <= 0) {
//       return null;
//     }

//     return {
//       token,
//       shipperId: parsedShipperId,
//     };
//   }, []);

//   // ======================================================
//   // FETCH API CÓ JWT
//   // ======================================================

//   const fetchWithAuth = useCallback(
//     async <T,>(url: string, options?: RequestInit): Promise<ApiResponse<T>> => {
//       const token = await AsyncStorage.getItem("token");

//       if (!token) {
//         await AsyncStorage.multiRemove(["token", "shipperId", "shipperInfo"]);

//         router.replace("/LoginScreen");

//         throw new Error("Bạn chưa đăng nhập.");
//       }

//       const response = await fetch(url, {
//         ...options,

//         headers: {
//           "Content-Type": "application/json",

//           Authorization: `Bearer ${token}`,

//           ...(options?.headers || {}),
//         },
//       });

//       let result: ApiResponse<T>;

//       try {
//         result = (await response.json()) as ApiResponse<T>;
//       } catch {
//         throw new Error("Server trả về dữ liệu không hợp lệ.");
//       }

//       // ==================================================
//       // JWT HẾT HẠN
//       // ==================================================

//       if (response.status === 401) {
//         await AsyncStorage.multiRemove(["token", "shipperId", "shipperInfo"]);

//         router.replace("/LoginScreen");

//         throw new Error(result.message || "Phiên đăng nhập đã hết hạn.");
//       }

//       // ==================================================
//       // HTTP ERROR
//       // ==================================================

//       if (!response.ok) {
//         throw new Error(result.message || "Có lỗi xảy ra khi gọi API.");
//       }

//       return result;
//     },
//     [router],
//   );

//   // ======================================================
//   // LẤY THÔNG TIN SHIPPER
//   // ======================================================

//   const fetchShipper = useCallback(
//     async (id: number): Promise<Shipper> => {
//       const result = await fetchWithAuth<Shipper>(
//         `${BASE_URL}/api/shippers/${id}`,
//       );

//       if (!result.success || !result.data) {
//         throw new Error(result.message || "Không lấy được thông tin shipper.");
//       }

//       return result.data;
//     },
//     [fetchWithAuth],
//   );

//   // ======================================================
//   // LẤY DELIVERY CỦA SHIPPER
//   // ======================================================

//   const fetchDelivery = useCallback(
//     async (id: number): Promise<Delivery[]> => {
//       const result = await fetchWithAuth<Delivery[]>(
//         `${BASE_URL}/api/deliveries/shipper/${id}`,
//       );

//       if (!result.success || !result.data) {
//         return [];
//       }

//       return result.data;
//     },
//     [fetchWithAuth],
//   );

//   // ======================================================
//   // TÌM DELIVERY HIỆN TẠI
//   // ======================================================

//   const findCurrentDelivery = (deliveries: Delivery[]): Delivery | null => {
//     const current = deliveries.find(
//       (item) =>
//         item.delivery_status === DELIVERY_ACCEPTED ||
//         item.delivery_status === DELIVERY_PICKED_UP ||
//         item.delivery_status === DELIVERY_DELIVERING,
//     );

//     return current || null;
//   };

//   // ======================================================
//   // LOAD DATA
//   // ======================================================

//   const loadData = useCallback(
//     async (showLoading = true) => {
//       try {
//         if (showLoading) {
//           setIsLoading(true);
//         }

//         const authData = await getAuthData();

//         if (!authData) {
//           router.replace("/LoginScreen");
//           return;
//         }

//         setShipperId(authData.shipperId);

//         // Lấy shipper
//         const shipperData = await fetchShipper(authData.shipperId);

//         setShipper(shipperData);

//         // Lấy delivery
//         const deliveries = await fetchDelivery(authData.shipperId);

//         const currentDelivery = findCurrentDelivery(deliveries);

//         setDelivery(currentDelivery);
//       } catch (error) {
//         console.error("Lỗi load trang giao hàng:", error);

//         const message =
//           error instanceof Error ? error.message : "Không thể tải dữ liệu.";

//         Alert.alert("Lỗi", message);
//       } finally {
//         setIsLoading(false);
//         setIsRefreshing(false);
//       }
//     },
//     [fetchDelivery, fetchShipper, getAuthData, router],
//   );

//   // ======================================================
//   // LOAD LẦN ĐẦU
//   // ======================================================

//   useEffect(() => {
//     loadData();
//   }, [loadData]);

//   // ======================================================
//   // REFRESH
//   // ======================================================

//   const handleRefresh = async () => {
//     setIsRefreshing(true);

//     await loadData(false);
//   };

//   // ======================================================
//   // FORMAT TIỀN
//   // ======================================================

//   const formatMoney = (value?: number): string => {
//     if (value === undefined || value === null) {
//       return "0 đ";
//     }

//     return `${Number(value).toLocaleString("vi-VN")} đ`;
//   };

//   // ======================================================
//   // FORMAT NGÀY
//   // ======================================================

//   const formatDate = (value?: string | null): string => {
//     if (!value) {
//       return "Chưa cập nhật";
//     }

//     const date = new Date(value);

//     if (Number.isNaN(date.getTime())) {
//       return value;
//     }

//     return date.toLocaleString("vi-VN");
//   };

//   // ======================================================
//   // CẬP NHẬT DELIVERY STATUS
//   // ======================================================
//   //
//   // QUAN TRỌNG:
//   //
//   // POST /api/deliveries/:id/status
//   //
//   // Không dùng:
//   // PUT /api/deliveries/:id
//   //
//   // ======================================================

//   const updateDeliveryStatus = async (newDeliveryStatus: string) => {
//     if (!delivery) {
//       throw new Error("Không có đơn giao hàng.");
//     }

//     const result = await fetchWithAuth<Delivery>(
//       `${BASE_URL}/api/deliveries/${delivery.delivery_id}/status`,
//       {
//         method: "POST",

//         body: JSON.stringify({
//           status: newDeliveryStatus,
//         }),
//       },
//     );

//     if (!result.success) {
//       throw new Error(
//         result.message || "Không thể cập nhật trạng thái giao hàng.",
//       );
//     }

//     return result;
//   };

//   // ======================================================
//   // ĐÃ LẤY HÀNG
//   // ======================================================

//   const handlePickedUp = () => {
//     if (!delivery) {
//       return;
//     }

//     Alert.alert("Xác nhận", "Bạn đã lấy hàng từ nhà hàng?", [
//       {
//         text: "Hủy",
//         style: "cancel",
//       },

//       {
//         text: "Đã lấy hàng",

//         onPress: async () => {
//           try {
//             setIsUpdating(true);

//             await updateDeliveryStatus(DELIVERY_PICKED_UP);

//             Alert.alert("Thành công", "Đã cập nhật trạng thái: Đã lấy hàng.");

//             await loadData(false);
//           } catch (error) {
//             console.error("Lỗi PICKED_UP:", error);

//             const message =
//               error instanceof Error
//                 ? error.message
//                 : "Không thể cập nhật trạng thái.";

//             Alert.alert("Lỗi", message);
//           } finally {
//             setIsUpdating(false);
//           }
//         },
//       },
//     ]);
//   };

//   // ======================================================
//   // BẮT ĐẦU GIAO HÀNG
//   // ======================================================

//   const handleDelivering = () => {
//     if (!delivery) {
//       return;
//     }

//     Alert.alert("Xác nhận", "Bạn bắt đầu giao đơn hàng này?", [
//       {
//         text: "Hủy",
//         style: "cancel",
//       },

//       {
//         text: "Bắt đầu giao",

//         onPress: async () => {
//           try {
//             setIsUpdating(true);

//             await updateDeliveryStatus(DELIVERY_DELIVERING);

//             Alert.alert("Thành công", "Đơn hàng đang được giao.");

//             await loadData(false);
//           } catch (error) {
//             console.error("Lỗi DELIVERING:", error);

//             const message =
//               error instanceof Error
//                 ? error.message
//                 : "Không thể cập nhật trạng thái.";

//             Alert.alert("Lỗi", message);
//           } finally {
//             setIsUpdating(false);
//           }
//         },
//       },
//     ]);
//   };

//   // ======================================================
//   // HOÀN THÀNH
//   // ======================================================

//   const handleCompleted = () => {
//     if (!delivery) {
//       return;
//     }

//     Alert.alert(
//       "Xác nhận hoàn thành",
//       "Bạn đã giao hàng thành công cho khách?",
//       [
//         {
//           text: "Hủy",
//           style: "cancel",
//         },

//         {
//           text: "Đã giao hàng",

//           onPress: async () => {
//             try {
//               setIsUpdating(true);

//               await updateDeliveryStatus(DELIVERY_COMPLETED);

//               Alert.alert("Hoàn thành", "Giao hàng thành công.");

//               setDelivery(null);

//               await loadData(false);
//             } catch (error) {
//               console.error("Lỗi COMPLETED:", error);

//               const message =
//                 error instanceof Error
//                   ? error.message
//                   : "Không thể hoàn thành giao hàng.";

//               Alert.alert("Lỗi", message);
//             } finally {
//               setIsUpdating(false);
//             }
//           },
//         },
//       ],
//     );
//   };

//   // ======================================================
//   // ĐĂNG XUẤT
//   // ======================================================

//   const handleLogout = () => {
//     Alert.alert("Đăng xuất", "Bạn có chắc muốn đăng xuất?", [
//       {
//         text: "Hủy",
//         style: "cancel",
//       },

//       {
//         text: "Đăng xuất",
//         style: "destructive",

//         onPress: async () => {
//           await AsyncStorage.multiRemove(["token", "shipperId", "shipperInfo"]);

//           router.replace("/LoginScreen");
//         },
//       },
//     ]);
//   };

//   // ======================================================
//   // DELIVERY STATUS TEXT
//   // ======================================================

//   const getDeliveryStatusText = (status?: string): string => {
//     switch (status) {
//       case DELIVERY_ACCEPTED:
//         return "Đã nhận đơn";

//       case DELIVERY_PICKED_UP:
//         return "Đã lấy hàng";

//       case DELIVERY_DELIVERING:
//         return "Đang giao hàng";

//       case DELIVERY_COMPLETED:
//         return "Đã giao hàng";

//       default:
//         return "Không xác định";
//     }
//   };

//   // ======================================================
//   // ORDER STATUS TEXT
//   // ======================================================

//   const getOrderStatusText = (status?: number): string => {
//     switch (status) {
//       case 4:
//         return "Chờ lấy hàng";

//       case 5:
//         return "Đã lấy hàng";

//       case 6:
//         return "Đang giao hàng";

//       case 7:
//         return "Đã hoàn thành";

//       default:
//         return `Trạng thái ${status ?? ""}`;
//     }
//   };

//   // ======================================================
//   // ACTION BUTTON
//   // ======================================================

//   const renderActionButton = () => {
//     if (!delivery) {
//       return null;
//     }

//     // ==================================================
//     // ACCEPTED
//     // ==================================================

//     if (delivery.delivery_status === DELIVERY_ACCEPTED) {
//       return (
//         <TouchableOpacity
//           style={styles.primaryButton}
//           onPress={handlePickedUp}
//           disabled={isUpdating}
//         >
//           {isUpdating ? (
//             <ActivityIndicator color="#fff" />
//           ) : (
//             <Text style={styles.primaryButtonText}>Đã lấy hàng</Text>
//           )}
//         </TouchableOpacity>
//       );
//     }

//     // ==================================================
//     // PICKED_UP
//     // ==================================================

//     if (delivery.delivery_status === DELIVERY_PICKED_UP) {
//       return (
//         <TouchableOpacity
//           style={styles.primaryButton}
//           onPress={handleDelivering}
//           disabled={isUpdating}
//         >
//           {isUpdating ? (
//             <ActivityIndicator color="#fff" />
//           ) : (
//             <Text style={styles.primaryButtonText}>Bắt đầu giao hàng</Text>
//           )}
//         </TouchableOpacity>
//       );
//     }

//     // ==================================================
//     // DELIVERING
//     // ==================================================

//     if (delivery.delivery_status === DELIVERY_DELIVERING) {
//       return (
//         <TouchableOpacity
//           style={styles.completeButton}
//           onPress={handleCompleted}
//           disabled={isUpdating}
//         >
//           {isUpdating ? (
//             <ActivityIndicator color="#fff" />
//           ) : (
//             <Text style={styles.primaryButtonText}>Đã giao hàng</Text>
//           )}
//         </TouchableOpacity>
//       );
//     }

//     return null;
//   };

//   // ======================================================
//   // LOADING
//   // ======================================================

//   if (isLoading) {
//     return (
//       <View style={styles.loadingContainer}>
//         <ActivityIndicator size="large" color="#f59e0b" />

//         <Text style={styles.loadingText}>Đang tải thông tin giao hàng...</Text>
//       </View>
//     );
//   }

//   // ======================================================
//   // UI
//   // ======================================================

//   return (
//     <View style={styles.container}>
//       {/* HEADER */}

//       <View style={styles.header}>
//         <View>
//           <Text style={styles.headerTitle}>Giao hàng</Text>

//           <Text style={styles.headerSubtitle}>Quản lý đơn hàng đang giao</Text>
//         </View>

//         <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
//           <Text style={styles.logoutText}>Đăng xuất</Text>
//         </TouchableOpacity>
//       </View>

//       <ScrollView
//         contentContainerStyle={styles.scrollContent}
//         refreshControl={
//           <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />
//         }
//       >
//         {/* SHIPPER */}

//         <View style={styles.shipperCard}>
//           <View style={styles.shipperHeader}>
//             <View>
//               <Text style={styles.shipperName}>
//                 {shipper?.full_name || "Shipper"}
//               </Text>

//               <Text style={styles.shipperPhone}>
//                 {shipper?.phone || "Chưa có số điện thoại"}
//               </Text>
//             </View>

//             <View
//               style={[
//                 styles.statusBadge,

//                 shipper?.status_id === SHIPPER_BUSY
//                   ? styles.busyBadge
//                   : styles.onlineBadge,
//               ]}
//             >
//               <Text style={styles.statusText}>
//                 {shipper?.status_id === SHIPPER_BUSY
//                   ? "BUSY"
//                   : shipper?.status_id === SHIPPER_ONLINE
//                     ? "ONLINE"
//                     : "OFFLINE"}
//               </Text>
//             </View>
//           </View>
//         </View>

//         {/* KHÔNG CÓ ĐƠN */}

//         {!delivery && (
//           <View style={styles.emptyCard}>
//             <Text style={styles.emptyIcon}>🚚</Text>

//             <Text style={styles.emptyTitle}>Chưa có đơn đang giao</Text>

//             <Text style={styles.emptyDescription}>
//               Khi bạn nhận một đơn hàng, thông tin đơn sẽ xuất hiện ở đây.
//             </Text>

//             <TouchableOpacity
//               style={styles.homeButton}
//               onPress={() => router.replace("/home")}
//             >
//               <Text style={styles.homeButtonText}>Quay lại trang chủ</Text>
//             </TouchableOpacity>
//           </View>
//         )}

//         {/* DELIVERY */}

//         {delivery && (
//           <>
//             {/* STATUS */}

//             <View style={styles.statusCard}>
//               <Text style={styles.sectionTitle}>Trạng thái đơn</Text>

//               <View style={styles.statusRow}>
//                 <View>
//                   <Text style={styles.statusLabel}>Giao hàng</Text>

//                   <Text style={styles.statusValue}>
//                     {getDeliveryStatusText(delivery.delivery_status)}
//                   </Text>
//                 </View>

//                 <View>
//                   <Text style={styles.statusLabel}>Đơn hàng</Text>

//                   <Text style={styles.statusValue}>
//                     {getOrderStatusText(delivery.order_status_id)}
//                   </Text>
//                 </View>
//               </View>
//             </View>

//             {/* THÔNG TIN ĐƠN */}

//             <View style={styles.card}>
//               <Text style={styles.sectionTitle}>Thông tin đơn hàng</Text>

//               <View style={styles.infoRow}>
//                 <Text style={styles.infoLabel}>Mã đơn</Text>

//                 <Text style={styles.infoValue}>
//                   {delivery.order_code || `#${delivery.order_id}`}
//                 </Text>
//               </View>

//               <View style={styles.infoRow}>
//                 <Text style={styles.infoLabel}>Tiền hàng</Text>

//                 <Text style={styles.infoValue}>
//                   {formatMoney(delivery.total_amount)}
//                 </Text>
//               </View>

//               <View style={styles.infoRow}>
//                 <Text style={styles.infoLabel}>Phí giao hàng</Text>

//                 <Text style={styles.feeValue}>
//                   {formatMoney(delivery.delivery_fee)}
//                 </Text>
//               </View>
//             </View>

//             {/* NHÀ HÀNG */}

//             <View style={styles.card}>
//               <Text style={styles.sectionTitle}>📍 Lấy hàng tại</Text>

//               <Text style={styles.restaurantName}>
//                 {delivery.restaurant_name || "Nhà hàng"}
//               </Text>

//               <Text style={styles.addressText}>
//                 {delivery.pickup_address || "Chưa có địa chỉ nhà hàng"}
//               </Text>

//               {delivery.restaurant_phone && (
//                 <Text style={styles.phoneText}>
//                   ☎ {delivery.restaurant_phone}
//                 </Text>
//               )}
//             </View>

//             {/* KHÁCH HÀNG */}

//             <View style={styles.card}>
//               <Text style={styles.sectionTitle}>🏠 Giao đến</Text>

//               <Text style={styles.customerName}>
//                 {delivery.receiver_name || "Khách hàng"}
//               </Text>

//               {delivery.receiver_phone && (
//                 <Text style={styles.phoneText}>
//                   ☎ {delivery.receiver_phone}
//                 </Text>
//               )}

//               <Text style={styles.addressText}>
//                 {delivery.delivery_address || "Chưa có địa chỉ giao hàng"}
//               </Text>
//             </View>

//             {/* GHI CHÚ */}

//             {delivery.note && (
//               <View style={styles.noteCard}>
//                 <Text style={styles.sectionTitle}>📝 Ghi chú</Text>

//                 <Text style={styles.noteText}>{delivery.note}</Text>
//               </View>
//             )}

//             {/* THỜI GIAN */}

//             <View style={styles.card}>
//               <Text style={styles.sectionTitle}>Thời gian</Text>

//               <View style={styles.infoRow}>
//                 <Text style={styles.infoLabel}>Lấy hàng</Text>

//                 <Text style={styles.infoValue}>
//                   {formatDate(delivery.pickup_time)}
//                 </Text>
//               </View>

//               <View style={styles.infoRow}>
//                 <Text style={styles.infoLabel}>Giao hàng</Text>

//                 <Text style={styles.infoValue}>
//                   {formatDate(delivery.delivery_time)}
//                 </Text>
//               </View>
//             </View>

//             {/* ACTION */}

//             <View style={styles.actionContainer}>{renderActionButton()}</View>
//           </>
//         )}
//       </ScrollView>
//     </View>
//   );
// }

// // ======================================================
// // STYLES
// // ======================================================

// const styles = StyleSheet.create({
//   container: {
//     flex: 1,
//     backgroundColor: "#f5f5f5",
//   },

//   loadingContainer: {
//     flex: 1,
//     justifyContent: "center",
//     alignItems: "center",
//     backgroundColor: "#f5f5f5",
//   },

//   loadingText: {
//     marginTop: 12,
//     fontSize: 15,
//     color: "#666",
//   },

//   header: {
//     backgroundColor: "#f59e0b",
//     paddingTop: 50,
//     paddingBottom: 20,
//     paddingHorizontal: 20,
//     flexDirection: "row",
//     justifyContent: "space-between",
//     alignItems: "center",
//   },

//   headerTitle: {
//     fontSize: 26,
//     fontWeight: "700",
//     color: "#fff",
//   },

//   headerSubtitle: {
//     marginTop: 4,
//     fontSize: 14,
//     color: "#fff",
//     opacity: 0.9,
//   },

//   logoutButton: {
//     backgroundColor: "#fff",
//     paddingHorizontal: 12,
//     paddingVertical: 8,
//     borderRadius: 8,
//   },

//   logoutText: {
//     color: "#dc2626",
//     fontWeight: "600",
//     fontSize: 13,
//   },

//   scrollContent: {
//     padding: 16,
//     paddingBottom: 40,
//   },

//   shipperCard: {
//     backgroundColor: "#fff",
//     borderRadius: 14,
//     padding: 18,
//     marginBottom: 14,
//     elevation: 2,
//     shadowOpacity: 0.08,
//     shadowRadius: 5,
//     shadowOffset: {
//       width: 0,
//       height: 2,
//     },
//   },

//   shipperHeader: {
//     flexDirection: "row",
//     justifyContent: "space-between",
//     alignItems: "center",
//   },

//   shipperName: {
//     fontSize: 19,
//     fontWeight: "700",
//     color: "#222",
//   },

//   shipperPhone: {
//     marginTop: 4,
//     color: "#777",
//     fontSize: 14,
//   },

//   statusBadge: {
//     paddingHorizontal: 12,
//     paddingVertical: 7,
//     borderRadius: 20,
//   },

//   onlineBadge: {
//     backgroundColor: "#dcfce7",
//   },

//   busyBadge: {
//     backgroundColor: "#fef3c7",
//   },

//   statusText: {
//     fontWeight: "700",
//     fontSize: 12,
//     color: "#166534",
//   },

//   emptyCard: {
//     backgroundColor: "#fff",
//     borderRadius: 14,
//     padding: 30,
//     alignItems: "center",
//     marginTop: 10,
//     elevation: 2,
//   },

//   emptyIcon: {
//     fontSize: 48,
//     marginBottom: 12,
//   },

//   emptyTitle: {
//     fontSize: 20,
//     fontWeight: "700",
//     color: "#222",
//     textAlign: "center",
//   },

//   emptyDescription: {
//     marginTop: 8,
//     fontSize: 14,
//     color: "#777",
//     textAlign: "center",
//     lineHeight: 21,
//   },

//   homeButton: {
//     marginTop: 20,
//     backgroundColor: "#f59e0b",
//     paddingHorizontal: 22,
//     paddingVertical: 12,
//     borderRadius: 9,
//   },

//   homeButtonText: {
//     color: "#fff",
//     fontWeight: "700",
//   },

//   statusCard: {
//     backgroundColor: "#fff",
//     borderRadius: 14,
//     padding: 18,
//     marginBottom: 14,
//     elevation: 2,
//   },

//   statusRow: {
//     flexDirection: "row",
//     justifyContent: "space-between",
//     marginTop: 14,
//   },

//   statusLabel: {
//     fontSize: 13,
//     color: "#777",
//     marginBottom: 5,
//   },

//   statusValue: {
//     fontSize: 15,
//     fontWeight: "700",
//     color: "#f59e0b",
//   },

//   card: {
//     backgroundColor: "#fff",
//     borderRadius: 14,
//     padding: 18,
//     marginBottom: 14,
//     elevation: 2,
//   },

//   sectionTitle: {
//     fontSize: 17,
//     fontWeight: "700",
//     color: "#222",
//     marginBottom: 14,
//   },

//   infoRow: {
//     flexDirection: "row",
//     justifyContent: "space-between",
//     paddingVertical: 8,
//     borderBottomWidth: 1,
//     borderBottomColor: "#eee",
//   },

//   infoLabel: {
//     fontSize: 14,
//     color: "#777",
//   },

//   infoValue: {
//     fontSize: 14,
//     fontWeight: "600",
//     color: "#222",
//     maxWidth: "60%",
//     textAlign: "right",
//   },

//   feeValue: {
//     fontSize: 15,
//     fontWeight: "700",
//     color: "#16a34a",
//   },

//   restaurantName: {
//     fontSize: 17,
//     fontWeight: "700",
//     color: "#222",
//     marginBottom: 8,
//   },

//   customerName: {
//     fontSize: 17,
//     fontWeight: "700",
//     color: "#222",
//     marginBottom: 5,
//   },

//   addressText: {
//     fontSize: 14,
//     color: "#555",
//     lineHeight: 21,
//   },

//   phoneText: {
//     marginTop: 8,
//     fontSize: 14,
//     color: "#2563eb",
//   },

//   noteCard: {
//     backgroundColor: "#fffbeb",
//     borderRadius: 14,
//     padding: 18,
//     marginBottom: 14,
//     borderWidth: 1,
//     borderColor: "#fde68a",
//   },

//   noteText: {
//     color: "#555",
//     fontSize: 14,
//     lineHeight: 21,
//   },

//   actionContainer: {
//     marginTop: 4,
//     marginBottom: 20,
//   },

//   primaryButton: {
//     backgroundColor: "#f59e0b",
//     borderRadius: 12,
//     paddingVertical: 16,
//     alignItems: "center",
//   },

//   completeButton: {
//     backgroundColor: "#16a34a",
//     borderRadius: 12,
//     paddingVertical: 16,
//     alignItems: "center",
//   },

//   primaryButtonText: {
//     color: "#fff",
//     fontSize: 16,
//     fontWeight: "700",
//   },
// });
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { API_BASE_URL } from "../constants/api";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

// ======================================================
// SHIPPER STATUS
// ======================================================

const SHIPPER_ONLINE = 2;
const SHIPPER_BUSY = 3;

// ======================================================
// DELIVERY STATUS
// ======================================================

const DELIVERY_ACCEPTED = "ACCEPTED";
const DELIVERY_PICKED_UP = "PICKED_UP";
const DELIVERY_DELIVERING = "DELIVERING";
const DELIVERY_COMPLETED = "COMPLETED";

// ======================================================
// ======================================================
// TYPES
// ======================================================

type DeliveryStatus =
  | "REQUESTED"
  | "ACCEPTED"
  | "PICKED_UP"
  | "DELIVERING"
  | "COMPLETED"
  | "CANCELLED";

interface Delivery {
  delivery_id: number;
  order_id: number;
  shipper_id?: number;

  pickup_time: string | null;
  delivery_time: string | null;

  delivery_status: DeliveryStatus;

  note: string | null;

  order_code: string;
  total_amount: string;

  order_status: string;

  restaurant_name: string;
  restaurant_address: string | null;
  full_address: string | null;
  restaurant_phone: string | null;

  receiver_name: string | null;
  receiver_phone: string | null;
}

interface Shipper {
  shipper_id: number;
  user_id: number;

  full_name: string;
  phone: string;

  status_id: number;
}

interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data?: T;
}

// ======================================================
// COMPONENT
// ======================================================

export default function GiaohangScreen() {
  const router = useRouter();

  const [shipper, setShipper] = useState<Shipper | null>(null);
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [errorMessage, setErrorMessage] = useState("");

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  // ======================================================
  // LẤY TOKEN + SHIPPER ID
  // ======================================================

  const getAuthData = useCallback(async () => {
    const token = await AsyncStorage.getItem("token");
    const shipperIdString = await AsyncStorage.getItem("shipperId");

    console.log("========================================");
    console.log("AUTH DATA");
    console.log("Shipper ID:", shipperIdString);
    console.log("Có token:", !!token);
    console.log("========================================");

    if (!token) {
      throw new Error("Không tìm thấy token đăng nhập.");
    }

    if (!shipperIdString) {
      throw new Error("Không tìm thấy shipperId.");
    }

    const shipperId = Number(shipperIdString);

    if (!Number.isInteger(shipperId) || shipperId <= 0) {
      throw new Error("shipperId không hợp lệ.");
    }

    return {
      token,
      shipperId,
    };
  }, []);

  // ======================================================
  // FETCH API CÓ JWT
  // ======================================================

  const fetchWithAuth = useCallback(
    async (url: string, options: RequestInit = {}) => {
      const token = await AsyncStorage.getItem("token");

      if (!token) {
        throw new Error("Phiên đăng nhập đã hết.");
      }

      console.log("========================================");
      console.log("API REQUEST");
      console.log("URL:", url);
      console.log("METHOD:", options.method || "GET");
      console.log("========================================");

      const response = await fetch(url, {
        ...options,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          ...(options.headers || {}),
        },
      });

      console.log("HTTP STATUS:", response.status);

      const text = await response.text();

      let result: ApiResponse<unknown>;

      try {
        result = JSON.parse(text);
      } catch {
        throw new Error(`Server trả về dữ liệu không hợp lệ: ${text}`);
      }

      console.log("API RESULT:", JSON.stringify(result, null, 2));

      if (response.status === 401) {
        await AsyncStorage.multiRemove(["token", "shipperId"]);

        router.replace("/LoginScreen");

        throw new Error("Phiên đăng nhập đã hết.");
      }

      if (!response.ok || !result.success) {
        throw new Error(result.message || `API lỗi HTTP ${response.status}`);
      }

      return result;
    },
    [router],
  );

  // ======================================================
  // LẤY THÔNG TIN SHIPPER
  // ======================================================

  const fetchShipper = useCallback(
    async (shipperId: number) => {
      const result = await fetchWithAuth(
        `${API_BASE_URL}/api/shippers/${shipperId}`,
      );

      const data = result.data as Shipper;

      console.log("SHIPPER DATA:", data);

      return data;
    },
    [fetchWithAuth],
  );

  // ======================================================
  // LẤY DANH SÁCH DELIVERY
  // ======================================================

  const fetchDeliveries = useCallback(
    async () => {
      const result = await fetchWithAuth(
        `${API_BASE_URL}/api/deliveries/mine`,
      );

      const data = result.data as Delivery[];

      console.log("DELIVERIES:", JSON.stringify(data, null, 2));

      return data;
    },
    [fetchWithAuth],
  );

  // ======================================================
  // TÌM ĐƠN ĐANG GIAO
  // ======================================================

  const findCurrentDeliveries = (items: Delivery[]): Delivery[] => {
    const current = items.filter(
      (item) =>
        item.delivery_status === DELIVERY_ACCEPTED ||
        item.delivery_status === DELIVERY_PICKED_UP ||
        item.delivery_status === DELIVERY_DELIVERING,
    );

    console.log("CURRENT DELIVERIES:");
    console.log(
      JSON.stringify(current, null, 2),
    );

    return current;
  };

  // ======================================================
  // LOAD DATA
  // ======================================================

  const loadData = useCallback(async () => {
    try {
      console.log("========================================");
      console.log("LOAD DELIVERY DATA");
      console.log("========================================");

      const auth = await getAuthData();

      const [shipperData, deliveries] = await Promise.all([
        fetchShipper(auth.shipperId),
        fetchDeliveries(),
      ]);

      const currentDeliveries = findCurrentDeliveries(deliveries);

      setShipper(shipperData);
      setDeliveries(currentDeliveries);
      setErrorMessage("");

      console.log("========================================");
      console.log("STATE SAU LOAD");
      console.log("Số đơn active:", currentDeliveries.length);
      console.log("========================================");
    } catch (error) {
      console.error("LOAD DATA ERROR:", error);
      setErrorMessage(
        error instanceof Error ? error.message : "Không thể tải đơn giao hàng.",
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [getAuthData, fetchShipper, fetchDeliveries]);

  // ======================================================
  // LOAD KHI MỞ SCREEN
  // ======================================================

  useFocusEffect(
    useCallback(() => {
      void loadData();
    }, [loadData]),
  );

  // ======================================================
  // REFRESH
  // ======================================================

  const handleRefresh = () => {
    console.log("REFRESH DELIVERY");

    setRefreshing(true);

    loadData();
  };

  // ======================================================
  // UPDATE DELIVERY STATUS
  // ======================================================

  const updateDeliveryStatus = useCallback(
    async (delivery: Delivery, newStatus: DeliveryStatus) => {
      console.log("");
      console.log("========================================");
      console.log("UPDATE DELIVERY STATUS");
      console.log("========================================");
      console.log("Delivery ID:", delivery.delivery_id);
      console.log("Order ID:", delivery.order_id);
      console.log("Shipper ID:", delivery.shipper_id);
      console.log("Current status:", delivery.delivery_status);
      console.log("New status:", newStatus);
      console.log("========================================");

      const actionByStatus: Partial<Record<DeliveryStatus, string>> = {
        PICKED_UP: "pickup",
        DELIVERING: "start",
        COMPLETED: "complete",
      };
      const action = actionByStatus[newStatus];

      if (!action) {
        throw new Error(`Không hỗ trợ cập nhật trạng thái ${newStatus}.`);
      }

      const result = await fetchWithAuth(
        `${API_BASE_URL}/api/deliveries/${delivery.delivery_id}/${action}`,
        { method: "POST" },
      );

      console.log("UPDATE THÀNH CÔNG");
      console.log(JSON.stringify(result, null, 2));

      return result;
    },
    [fetchWithAuth],
  );

  const advanceDelivery = async (
    delivery: Delivery,
    expectedStatus: DeliveryStatus,
    nextStatus: DeliveryStatus,
  ) => {
    if (isUpdating || delivery.delivery_status !== expectedStatus) {
      return;
    }

    try {
      setIsUpdating(true);
      setErrorMessage("");
      await updateDeliveryStatus(delivery, nextStatus);
      await loadData();
    } catch (error) {
      console.error("DELIVERY STATUS UPDATE ERROR:", error);
      setErrorMessage(
        error instanceof Error ? error.message : "Không thể cập nhật đơn giao.",
      );
    } finally {
      setIsUpdating(false);
    }
  };

  // ======================================================
  // RENDER ACTION BUTTON
  // ======================================================

  const renderActionButton = (delivery: Delivery) => {
    const action: {
      expected: DeliveryStatus;
      next: DeliveryStatus;
      label: string;
    } | null =
      delivery.delivery_status === DELIVERY_ACCEPTED
        ? {
            expected: DELIVERY_ACCEPTED,
            next: DELIVERY_PICKED_UP,
            label: "Đã lấy hàng",
          }
        : delivery.delivery_status === DELIVERY_PICKED_UP
          ? {
              expected: DELIVERY_PICKED_UP,
              next: DELIVERY_DELIVERING,
              label: "Bắt đầu giao hàng",
            }
          : delivery.delivery_status === DELIVERY_DELIVERING
            ? {
                expected: DELIVERY_DELIVERING,
                next: DELIVERY_COMPLETED,
                label: "Đã giao hàng",
              }
            : null;

    if (!action) return null;

    return (
      <Pressable
        disabled={isUpdating}
        onPress={() =>
          void advanceDelivery(delivery, action.expected, action.next)
        }
        style={({ pressed }) => [
          styles.actionButton,
          pressed && styles.actionButtonPressed,
          isUpdating && styles.actionButtonDisabled,
        ]}
      >
        {isUpdating ? (
          <ActivityIndicator color="#ffffff" />
        ) : (
          <Text style={styles.actionButtonText}>{action.label}</Text>
        )}
      </Pressable>
    );
  };

  // ======================================================
  // LOADING
  // ======================================================

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" />

        <Text style={styles.loadingText}>Đang tải dữ liệu...</Text>
      </View>
    );
  }

  // ======================================================
  // MAIN UI
  // ======================================================

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {/* ============================================
            HEADER
        ============================================ */}

        <View style={styles.header}>
          <Text style={styles.headerTitle}>Giao hàng</Text>

          <Text style={styles.headerSubtitle}>Quản lý đơn hàng của bạn</Text>
        </View>

        {/* ============================================
            SHIPPER
        ============================================ */}

        {shipper && (
          <View style={styles.shipperCard}>
            <Text style={styles.sectionTitle}>Thông tin Shipper</Text>

            <View style={styles.infoRow}>
              <Text style={styles.label}>Họ tên:</Text>

              <Text style={styles.value}>{shipper.full_name}</Text>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.label}>Số điện thoại:</Text>

              <Text style={styles.value}>{shipper.phone}</Text>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.label}>Trạng thái:</Text>

              <Text
                style={[
                  styles.value,
                  shipper.status_id === SHIPPER_BUSY
                    ? styles.busyText
                    : styles.onlineText,
                ]}
              >
                {shipper.status_id === SHIPPER_BUSY
                  ? "Đang giao hàng"
                  : shipper.status_id === SHIPPER_ONLINE
                    ? "Đang online"
                    : `Status ${shipper.status_id}`}
              </Text>
            </View>
          </View>
        )}

        {/* ============================================
            KHÔNG CÓ ĐƠN
        ============================================ */}

        {errorMessage ? (
          <Text style={styles.errorMessage}>{errorMessage}</Text>
        ) : null}

        {deliveries.length === 0 && !errorMessage && (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyIcon}>📦</Text>

            <Text style={styles.emptyTitle}>Không có đơn hàng</Text>

            <Text style={styles.emptyText}>
              Hiện tại bạn chưa có đơn nào đang giao. Kéo xuống để làm mới.
            </Text>
          </View>
        )}

        {/* ============================================
            DELIVERY
        ============================================ */}

        {deliveries.map((delivery) => (
          <View key={delivery.delivery_id}>
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Thông tin đơn hàng</Text>

              <View style={styles.infoRow}>
                <Text style={styles.label}>Mã đơn:</Text>
                <Text style={styles.value}>{delivery.order_code}</Text>
              </View>

              <View style={styles.infoRow}>
                <Text style={styles.label}>Trạng thái:</Text>
                <Text style={styles.statusText}>{delivery.delivery_status}</Text>
              </View>

              <View style={styles.infoRow}>
                <Text style={styles.label}>Tổng tiền:</Text>
                <Text style={styles.priceText}>
                  {Number(delivery.total_amount).toLocaleString("vi-VN")} ₫
                </Text>
              </View>
            </View>

            <View style={styles.card}>
              <Text style={styles.sectionTitle}>🏪 Nhà hàng</Text>
              <Text style={styles.restaurantName}>{delivery.restaurant_name}</Text>
              <Text style={styles.address}>{delivery.restaurant_address}</Text>
              <Text style={styles.phone}>☎ {delivery.restaurant_phone}</Text>
            </View>

            <View style={styles.card}>
              <Text style={styles.sectionTitle}>👤 Khách hàng</Text>
              <Text style={styles.customerName}>{delivery.receiver_name}</Text>
              <Text style={styles.address}>{delivery.full_address}</Text>
              <Text style={styles.phone}>☎ {delivery.receiver_phone}</Text>
            </View>

            {delivery.note ? (
              <View style={styles.card}>
                <Text style={styles.sectionTitle}>📝 Ghi chú</Text>
                <Text style={styles.note}>{delivery.note}</Text>
              </View>
            ) : null}

            <View style={styles.actionContainer}>
              {renderActionButton(delivery)}
            </View>
          </View>
        ))}
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
    backgroundColor: "#f5f5f5",
  },

  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },

  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f5f5f5",
  },

  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: "#555",
  },

  errorMessage: {
    color: "#b91c1c",
    backgroundColor: "#fef2f2",
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
  },

  // ====================================================
  // HEADER
  // ====================================================

  header: {
    marginBottom: 16,
  },

  headerTitle: {
    fontSize: 28,
    fontWeight: "700",
    color: "#222",
  },

  headerSubtitle: {
    marginTop: 4,
    fontSize: 15,
    color: "#777",
  },

  // ====================================================
  // SHIPPER
  // ====================================================

  shipperCard: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,

    shadowOffset: {
      width: 0,
      height: 2,
    },

    shadowOpacity: 0.08,
    shadowRadius: 4,

    elevation: 2,
  },

  // ====================================================
  // CARD
  // ====================================================

  card: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,

    shadowOffset: {
      width: 0,
      height: 2,
    },

    shadowOpacity: 0.08,
    shadowRadius: 4,

    elevation: 2,
  },

  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#222",
    marginBottom: 14,
  },

  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },

  label: {
    fontSize: 15,
    color: "#777",
    flex: 1,
  },

  value: {
    fontSize: 15,
    fontWeight: "600",
    color: "#222",
    flex: 1,
    textAlign: "right",
  },

  onlineText: {
    color: "#16a34a",
  },

  busyText: {
    color: "#ea580c",
  },

  statusText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#2563eb",
  },

  priceText: {
    fontSize: 17,
    fontWeight: "700",
    color: "#dc2626",
  },

  restaurantName: {
    fontSize: 17,
    fontWeight: "700",
    color: "#222",
    marginBottom: 8,
  },

  customerName: {
    fontSize: 17,
    fontWeight: "700",
    color: "#222",
    marginBottom: 8,
  },

  address: {
    fontSize: 15,
    color: "#555",
    lineHeight: 22,
    marginBottom: 6,
  },

  phone: {
    fontSize: 15,
    color: "#2563eb",
  },

  note: {
    fontSize: 15,
    color: "#555",
    lineHeight: 22,
  },

  // ====================================================
  // DEBUG
  // ====================================================

  debugBox: {
    backgroundColor: "#fff7ed",
    borderWidth: 1,
    borderColor: "#fb923c",
    borderRadius: 10,
    padding: 14,
    marginBottom: 16,
  },

  debugTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#c2410c",
    marginBottom: 8,
  },

  debugText: {
    fontSize: 14,
    color: "#7c2d12",
    marginBottom: 4,
  },

  // ====================================================
  // EMPTY
  // ====================================================

  emptyCard: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 30,
    alignItems: "center",
    marginTop: 20,
  },

  emptyIcon: {
    fontSize: 48,
    marginBottom: 12,
  },

  emptyTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#222",
    marginBottom: 8,
  },

  emptyText: {
    fontSize: 15,
    color: "#777",
    textAlign: "center",
    lineHeight: 22,
  },

  // ====================================================
  // ACTION BUTTON
  // ====================================================

  actionContainer: {
    marginTop: 4,
    marginBottom: 20,
  },

  actionButton: {
    minHeight: 56,
    borderRadius: 12,
    backgroundColor: "#ea580c",

    justifyContent: "center",
    alignItems: "center",

    paddingHorizontal: 20,

    shadowOffset: {
      width: 0,
      height: 3,
    },

    shadowOpacity: 0.2,
    shadowRadius: 5,

    elevation: 4,
  },

  actionButtonPressed: {
    opacity: 0.7,
    transform: [
      {
        scale: 0.98,
      },
    ],
  },

  actionButtonDisabled: {
    opacity: 0.5,
  },

  actionButtonText: {
    color: "#ffffff",
    fontSize: 18,
    fontWeight: "700",
  },
});
