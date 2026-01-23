import React, { useState, useEffect  } from 'react';
import { View, StyleSheet, ScrollView, Alert, TouchableOpacity, KeyboardAvoidingView, Platform, Image } from 'react-native';
import { Input, Button, Text, Card, Divider  } from 'react-native-elements';
import { Picker } from '@react-native-picker/picker';
import * as ImagePicker from 'expo-image-picker';
import { ordersService } from '../services/api';

export const OrderEntryScreen = ({ navigation }) => {
  const [nextOrderNumber, setNextOrderNumber] = useState('Loading...');
  const [showCargoOptions, setShowCargoOptions] = useState(false);
  const [formData, setFormData] = useState({
    customerName: '',
    OrderNumber: '',
    customerPhone: '',
    receiverName: '',
    receiverPhone: '',
    pickupAddress: '',
    cargoType: '',
    weight: '',
    price: '',
    notes: '',
  });
  const [loading, setLoading] = useState(false);
  const [photo, setPhoto] = useState(null);
  const [cameraPermission, setCameraPermission] = useState(null);

  useEffect(() => {
    loadNextOrderNumber();
    requestCameraPermission();
  }, []);

  const requestCameraPermission = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    setCameraPermission(status === 'granted');
    
    if (status !== 'granted') {
      Alert.alert(
        'Зөвшөөрөл Хэрэгтэй',
        'Камер ашиглахын тулд зөвшөөрөл өгнө үү'
      );
    }
  };

  const loadNextOrderNumber = async () => {
    try {
      const response = await ordersService.getNextOrderNumber();
      setNextOrderNumber(response.orderNumber);
    } catch (error) {
      console.error('Error loading next order number:', error);
      setNextOrderNumber('Error loading');
    }
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const takePhoto = async () => {
      const requestCameraPermission = async () => {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      setCameraPermission(status === 'granted');
      
      if (status !== 'granted') {
        Alert.alert(
          'Зөвшөөрөл Хэрэгтэй',
          'Камер ашиглахын тулд зөвшөөрөл өгнө үү'
        );
      }
    }; 

    try {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [3, 4] ,
        quality: 0.5,
        base64: true
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        setPhoto(result.assets[0]);
        Alert.alert('Амжилттай', 'Зураг амжилттай авлаа');
      }
    } catch (error) {
      console.error('Camera error:', error);
      Alert.alert('Алдаа', 'Зураг авахад алдаа гарлаа');
    }
  };

  const pickImageFromGallery = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [3,4],
        quality: 0.5,
        base64: true
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        setPhoto(result.assets[0]);
        Alert.alert('Амжилттай', 'Зураг амжилттай сонголоо');
      }
    } catch (error) {
      console.error('Gallery error:', error);
      Alert.alert('Алдаа', 'Зураг сонгохдоо алдаа гарлаа');
    }
  };


  const validateForm = () => {
    const required = [
      { field: 'customerName', label: 'Илгээгчийн Нэр' },
      { field: 'customerPhone', label: 'Илгээгчийн Утас' },
      { field: 'receiverName', label: 'Хүлээн Авагчийн Нэр' },
      { field: 'receiverPhone', label: 'Хүлээн Авагчийн Утас' },
      { field: 'pickupAddress', label: 'Ачаа Хүлээн Авсан Хаяг' },
      { field: 'cargoType', label: 'Ачааны Төрөл' },
      { field: 'price', label: 'Үнэ' }
    ];

    for (const { field, label } of required) {
      if (!formData[field] || formData[field].trim() === '') {
        Alert.alert('Алдаа!', `${label} заавал бөглөнө үү!`);
        return false;
      }
    }

    // Validate phone numbers
    if (formData.customerPhone.length < 9 && formData.customerPhone.length > 11) {
      Alert.alert('Алдаа!', 'Илгээгчийн утасны дугаар буруу байна!');
      return false;
    }

    if (formData.receiverPhone.length > 8 && formData.receiverPhone.length < 6 && formData.receiverPhone.length == 7) {
      Alert.alert('Алдаа!', 'Хүлээн авагчийн утасны дугаар буруу байна!');
      return false;
    }

    return true;
  };


  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }
    console.log("Submitting order with data:", formData);

    setLoading(true);
    try {
      const orderData = {
        customerName: formData.customerName,
        OrderNumber: nextOrderNumber,
        customerPhone: formData.customerPhone,
        receiverName: formData.receiverName,
        receiverPhone: formData.receiverPhone,
        pickupAddress: formData.pickupAddress,
        cargoType: formData.cargoType,
        weight: formData.weight ? parseFloat(formData.weight) : null,
        price: formData.price ? parseFloat(formData.price) : null,
        notes: formData.notes,
        photoBase64: photo?.base64 ? `data:image/jpeg;base64,${photo.base64}` : null,
      };
      
      await ordersService.createOrder(orderData);
      Alert.alert('Амжилттай!', 'Захиалга амжилттай үүслээ!', [
        { text: 'OK', onPress: () => {
          setFormData({
            customerName: '',
            OrderNumber: '',
            customerPhone: '',
            receiverName: '',
            receiverPhone: '',
            pickupAddress: '',
            cargoType: '',
            weight: '', 
            price: '',
            notes: '',
          });
          setPhoto(null);
          loadNextOrderNumber();
          navigation.navigate('Orders');
        }}
      ]);
    } catch (error) {
        console.log("Here is the error", error);
      Alert.alert('Алдаа!', 'Захиалга үүсгэлт амжилтгүй, захиалгыг дахин шалгана уу?');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <ScrollView style={styles.container}  
        contentContainerStyle={{ paddingBottom: 50 }} 
        keyboardShouldPersistTaps="handled"
      >
        <Card>
          
          <Text h4 style={styles.title}>Захиалгын Дугаар: {nextOrderNumber}</Text>
          <Text style={styles.sectionTitle}>Илгээгчийн Мэдээлэл</Text>
          <Input
            placeholder="Нэр *"
            value={formData.customerName}
            onChangeText={(value) => handleInputChange('customerName', value)}
            leftIcon={{ type: 'material', name: 'person' }}
          />
          
          <Input
            placeholder="Утасны Дугаар *"
            value={formData.customerPhone}
            onChangeText={(value) => handleInputChange('customerPhone', value)}
            keyboardType="phone-pad"
            leftIcon={{ type: 'material', name: 'phone' }}
          />

          <Text style={styles.sectionTitle}>Хүлээн Авагчийн Мэдээлэл</Text>
          <Input
            placeholder="Нэр *"
            value={formData.receiverName}
            onChangeText={(value) => handleInputChange('receiverName', value)}
            leftIcon={{ type: 'material', name: 'person' }}
          />
          
          <Input
            placeholder="Утасны Дугаар *"
            value={formData.receiverPhone}
            onChangeText={(value) => handleInputChange('receiverPhone', value)}
            keyboardType="phone-pad"
            returnKeyType="done"
            blurOnSubmit={true}
            leftIcon={{ type: 'material', name: 'phone' }}
          />
          
          <Text style={styles.sectionTitle}>Ачааны Мэдээлэл</Text>
          <Input
            placeholder="Хүлээн авсан хаяг *"
            value={formData.pickupAddress}
            onChangeText={(value) => handleInputChange('pickupAddress', value)}
            leftIcon={{ type: 'material', name: 'location-on' }}
            multiline={true}
          />
          
          <View style={styles.pickerContainer}>
            <Text style={styles.sectionTitle}>Ачааны Төрөл *</Text>
            <TouchableOpacity
              style={styles.dropdownButton}
              onPress={() => setShowCargoOptions(!showCargoOptions)}
            >
              <Text style={styles.dropdownText}>
                {formData.cargoType || 'Сонгох...'}
              </Text>
            </TouchableOpacity>

            {showCargoOptions && (
              <View style={styles.dropdownList}>
                {['Цахилгаан', 'Гэр Ахуй', 'Баглаа Боодол'].map((item) => (
                  <TouchableOpacity
                    key={item}
                    style={styles.dropdownItem}
                    onPress={() => {
                      handleInputChange('cargoType', item);
                      setShowCargoOptions(false);
                    }}
                  >
                    <Text style={styles.dropdownItemText}>{item}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
          
          <Input
            placeholder="Жин (кг)"
            value={formData.weight}
            onChangeText={(value) => handleInputChange('weight', value)}
            keyboardType="numeric"
            returnKeyType="done"
            blurOnSubmit={true}
            leftIcon={{ type: 'material', name: 'scale' }}
          />

          <Input
            placeholder="Үнэ (₮) *"
            value={formData.price}
            onChangeText={(value) => handleInputChange('price', value)}
            keyboardType="numeric"
            returnKeyType="done"
            blurOnSubmit={true}
            leftIcon={{ type: 'material', name: 'attach-money' }}
          />
          
          <Input
            placeholder="Нэмэлт Тэмдэглэл"
            value={formData.notes}
            onChangeText={(value) => handleInputChange('notes', value)}
            leftIcon={{ type: 'material', name: 'note' }}
            multiline={true}
            numberOfLines={3}
          />
          
          <View style={styles.photoSection}>
            <Button
              title="Камераар Зураг Авах"
              onPress={takePhoto}
              type="outline"
              icon={{ type: 'material', name: 'camera-alt', color: '#2196F3' }}
              buttonStyle={styles.photoButton}
            />
            
            <Button
              title="Зураг Сонгох"
              onPress={pickImageFromGallery}
              type="outline"
              icon={{ type: 'material', name: 'photo-library', color: '#4CAF50' }}
              buttonStyle={[styles.photoButton, { borderColor: '#4CAF50' }]}
            />
          </View>
          
          {photo && (
            <View style={styles.photoPreview}>
              <Image source={{ uri: photo.uri }} style={styles.photoImage} />
              <Text style={styles.photoText}>Зураг бэлэн ✓</Text>
            </View>
          )}
          
          <Button
            title="Захиалга Үүсгэх"
            onPress={handleSubmit}
            loading={loading}
            buttonStyle={styles.submitButton}
          />
        </Card>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5'
  },
  title: {
    textAlign: 'center',
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 10,
    marginBottom: 5,
    marginLeft: 10,
    color: '#333',
  },
  pickerContainer: {
    marginHorizontal: 10,
    marginBottom: 15,
  },
  pickerLabel: {
    fontSize: 14,
    color: '#86939e',
    fontWeight: 'bold',
    marginRight: 10,
  },
  picker: {
    width: 160,          // make picker small
    height: 40,
    backgroundColor: '#f0f0f0',
    borderRadius: 5,
  },
  dropdownButton: {
    backgroundColor: '#f0f0f0',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 6,
  },

  dropdownText: {
    fontSize: 14,
    color: '#333',
  },

  dropdownList: {
    backgroundColor: '#fff',
    borderRadius: 6,
    marginTop: 5,
    borderWidth: 1,
    borderColor: '#ddd',
    overflow: 'hidden',
  },

  dropdownItem: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },

  dropdownItemText: {
    fontSize: 14,
    color: '#333',
  },
  submitButton: {
    marginTop: 20,
    backgroundColor: '#4CAF50',
  },
  photoSection: {
    marginVertical: 10,
  },
  photoButton: {
    marginVertical: 5,
    borderColor: '#2196F3',
  },
  photoPreview: {
    alignItems: 'center',
    marginVertical: 10,
  },
  photoImage: {
    width: 150,
    height: 200,
    borderRadius: 10,
    marginBottom: 10,
  },
  photoText: {
    textAlign: 'center',
    color: 'green',
    fontSize: 14,
    fontWeight: 'bold',
  },
});