import React, { useState, useEffect  } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { Input, Button, Text, Card, Divider  } from 'react-native-elements';
import * as ImagePicker from 'expo-image-picker';
import { ordersService } from '../services/api';

export const OrderEntryScreen = ({ navigation }) => {
  const [nextOrderNumber, setNextOrderNumber] = useState('Loading...');
  const [formData, setFormData] = useState({
    customerName: '',
    customerPhone: '',
    pickupAddress: '',
    cargoType: '',
    weight: '',
    notes: '',
  });
  const [loading, setLoading] = useState(false);
  const [photo, setPhoto] = useState(null);

  useEffect(() => {
    loadNextOrderNumber();
  }, []);

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
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaType.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.5,
      base64: true
    });

    if (!result.canceled) {
      setPhoto(result.assets[0].uri);
    }
  };

  const handleSubmit = async () => {
    if (!formData.customerName || !formData.pickupAddress) {
      Alert.alert('Алдаа!', 'Шаардлагатай мэдээллүүдийг бөглөнө үү?');
      return;
    }

    setLoading(true);
    try {
      const orderData = {
        ...formData,
        weight: formData.weight ? parseFloat(formData.weight) : null,
        photoBase64: photo?.base64 ? `data:image/jpeg;base64,${photo.base64}` : null,
      };
      
      await ordersService.createOrder(orderData);
      Alert.alert('Амжилттай!', 'Захиалга амжилттай үүслээ!', [
        { text: 'OK', onPress: () => {
          setFormData({
            customerName: '',
            customerPhone: '',
            pickupAddress: '',
            cargoType: '',
            weight: '', 
            notes: '',
          });
          setPhoto(null);
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
    <ScrollView style={styles.container}>
      <Card>
        
        <Text h4 style={styles.title}>Захиалгын Дугаар: {nextOrderNumber}</Text>
        
        <Input
          placeholder="Үйлчлүүлэгчийн Нэр *"
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
        
        <Input
          placeholder="Ачаа хүлээн авсан хаяг *"
          value={formData.pickupAddress}
          onChangeText={(value) => handleInputChange('pickupAddress', value)}
          leftIcon={{ type: 'material', name: 'location-on' }}
          multiline={true}
        />
        
        
        <Input
          placeholder="Ачааны төрөл"
          value={formData.cargoType}
          onChangeText={(value) => handleInputChange('cargoType', value)}
          leftIcon={{ type: 'material', name: 'inventory' }}
        />
        
        <Input
          placeholder="Жин (кг)"
          value={formData.weight}
          onChangeText={(value) => handleInputChange('weight', value)}
          keyboardType="numeric"
          leftIcon={{ type: 'material', name: 'scale' }}
        />
        
        <Input
          placeholder="Нэмэлт Тэмдэглэл"
          value={formData.notes}
          onChangeText={(value) => handleInputChange('notes', value)}
          leftIcon={{ type: 'material', name: 'note' }}
          multiline={true}
          numberOfLines={3}
        />
        
        <Button
          title="Ачааны Зураг Оруулах"
          onPress={takePhoto}
          type="outline"
          icon={{ type: 'material', name: 'camera-alt', color: '#2196F3' }}
          buttonStyle={styles.photoButton}
        />
        
        {photo && <Text style={styles.photoText}>Photo captured ✓</Text>}
        
        <Button
          title="Захиалга Үүсгэх"
          onPress={handleSubmit}
          loading={loading}
          buttonStyle={styles.submitButton}
        />
      </Card>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  title: {
    textAlign: 'center',
    marginBottom: 20,
  },
  photoButton: {
    marginVertical: 10,
    borderColor: '#2196F3',
  },
  photoText: {
    textAlign: 'center',
    color: 'green',
    marginBottom: 10,
  },
  submitButton: {
    marginTop: 20,
    backgroundColor: '#4CAF50',
  },
});