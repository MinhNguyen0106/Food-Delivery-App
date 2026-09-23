import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";

export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      if (Platform.OS === "web") {
        window.alert("Vui lòng nhập đầy đủ Email và Mật khẩu!");
      } else {
        Alert.alert("Thông báo", "Vui lòng nhập đầy đủ Email và Mật khẩu!");
      }
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("http://localhost:3000/api/users/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        // 1. LƯU THÔNG TIN SHIPPER VÀO ASYNCSTORAGE (Lưu ID hoặc object shipper)
        const shipperData = result.data; // Giả sử Backend trả về object shipper trong result.data
        const shipperId = shipperData._id || shipperData.id;

        await AsyncStorage.setItem("shipperId", String(shipperId));
        await AsyncStorage.setItem("shipperInfo", JSON.stringify(shipperData));

        // 2. Chuyển sang trang Home
        router.replace("/home");
      } else {
        const errorMsg = result.message || "Đã có lỗi xảy ra.";
        if (Platform.OS === "web") {
          window.alert(`Đăng nhập thất bại: ${errorMsg}`);
        } else {
          Alert.alert("Đăng nhập thất bại", errorMsg);
        }
      }
    } catch (error) {
      console.error("Lỗi Đăng Nhập:", error);
      const connMsg =
        "Không thể kết nối đến máy chủ. Vui lòng kiểm tra lại Backend!";
      if (Platform.OS === "web") {
        window.alert(connMsg);
      } else {
        Alert.alert("Lỗi kết nối", connMsg);
      }
    } finally {
      setLoading(false);
    }
  };

  const FormContent = (
    <View style={styles.inner}>
      <View style={styles.headerContainer}>
        <Text style={styles.title}>SHIPPER APP</Text>
        <Text style={styles.subtitle}>Đăng nhập để nhận đơn hàng ngay</Text>
      </View>

      <View style={styles.formContainer}>
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Email Shipper</Text>
          <TextInput
            style={styles.input}
            placeholder="Nhập email (VD: shipper1@example.com)"
            placeholderTextColor="#999"
            keyboardType="email-address"
            autoCapitalize="none"
            value={email}
            onChangeText={setEmail}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Mật khẩu</Text>
          <TextInput
            style={styles.input}
            placeholder="Nhập mật khẩu"
            placeholderTextColor="#999"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />
        </View>

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleLogin}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#FFF" size="small" />
          ) : (
            <Text style={styles.buttonText}>ĐĂNG NHẬP</Text>
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.hintBox}>
        <Text style={styles.hintTitle}>Tài khoản thử nghiệm (CSDL):</Text>
        <Text style={styles.hintText}>Email: shipper1@example.com</Text>
        <Text style={styles.hintText}>Mật khẩu: HASH_SHIPPER_1</Text>
      </View>
    </View>
  );

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
    >
      {Platform.OS === "web" ? (
        FormContent
      ) : (
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          {FormContent}
        </TouchableWithoutFeedback>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8F9FA",
  },
  inner: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  headerContainer: {
    alignItems: "center",
    marginBottom: 36,
  },
  title: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#FF5722",
    letterSpacing: 1,
  },
  subtitle: {
    fontSize: 14,
    color: "#666",
    marginTop: 6,
  },
  formContainer: {
    backgroundColor: "#FFF",
    padding: 20,
    borderRadius: 12,
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: "#DDD",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    backgroundColor: "#FAFAFA",
    color: "#333",
  },
  button: {
    backgroundColor: "#FF5722",
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 10,
  },
  buttonDisabled: {
    backgroundColor: "#FFAB91",
  },
  buttonText: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "bold",
  },
  hintBox: {
    marginTop: 30,
    padding: 12,
    backgroundColor: "#FFF3E0",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#FFE0B2",
  },
  hintTitle: {
    fontSize: 13,
    fontWeight: "bold",
    color: "#E65100",
    marginBottom: 4,
  },
  hintText: {
    fontSize: 12,
    color: "#E65100",
  },
});
