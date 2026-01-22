import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert, Modal } from 'react-native';
import { Text, Button, Card, ListItem, Overlay, Divider } from 'react-native-elements';
import { ordersService } from '../services/api';
import * as SecureStore from 'expo-secure-store';

export const OrderDetailModal = ({ visible, order, onClose, onStatusUpdate }) => {
  const [updating, setUpdating] = useState(false);
  const [userRole, setUserRole] = useState('worker');

  useEffect(() => {
    loadUserRole();
  }, [])

  const loadUserRole = async () => {
    try {
      const userData = await SecureStore.getItemAsync('user');
      if (userData) {
        const user = JSON.parse(userData);
        setUserRole(user.role || 'worker');
      }
    } catch (error) {
      console.error('Error loading user role:', error);
    }
  };

  if (!order) return null;

  const getStatusOptions = () => {
    if (userRole === 'executive') {
      // Executives can set any status
      return [
        { value: 'received_package', label: 'Хүлээж Авсан' },
        { value: 'payment_feed', label: 'Төлбөр Төлсөн' },
        { value: 'delivered', label: 'Хүргэгдсэн' },
        { value: 'canceled', label: 'Цуцлагдсан' }
      ];
    } else {
      // Workers can only set to payment_feed if current status is received_package
      if (order.status === 'received_package') {
        return [
          { value: 'payment_feed', label: 'Төлбөр Төлсөн' }
        ];
      }
      return []; // No options if already payment_feed or beyond
    }
  };

  const statusOptions = getStatusOptions();

  const handleStatusUpdate = async (newStatus) => {
    Alert.alert(
      'Төлөв Шинчлэх',
      `Төлвийг "${getStatusLabel(newStatus)}" болгох уу?`,
      [
        { text: 'Цуцлах', style: 'cancel' },
        {
          text: 'Шинчлэх',
          onPress: async () => {
            setUpdating(true);
            try {
              await ordersService.updateOrder(order.id, { status: newStatus });
              Alert.alert('Амжилттай', 'Мэдээллийг Амжилттай Шинчиллээ');
              onStatusUpdate(); // Refresh the list
              onClose();
            } catch (error) {
              Alert.alert('Алдаа', 'Мэдээллийг Шинчлэхэд Алдаа Гарлаа!');
            } finally {
              setUpdating(false);
            }
          }
        }
      ]
    );
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'received_package': 
        return '#2196F3'; // Blue
      case 'payment_feed': 
        return '#FF9800'; // Orange
      case 'delivered': 
        return '#4CAF50'; // Green
      case 'canceled':
        return '#F44336'; // Red
      default: 
        return '#757575'; // Gray
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'received_package': 
        return 'Хүлээж Авсан';
      case 'payment_feed': 
        return 'Төлбөр Төлсөн';
      case 'delivered': 
        return 'Хүргэгдсэн';
      case 'canceled':
        return 'Цуцлагдсан';
      default: 
        return status;
    }
  };

  return (
    <Overlay
      isVisible={visible}
      onBackdropPress={onClose}
      overlayStyle={styles.overlay}
      fullScreen
    >
      <ScrollView>
        <Card containerStyle={styles.headerCard}>
          <View style={styles.header}>
            <Text h4>{order.order_number}</Text>
            <Button
              title="✕"
              type="арилгах"
              onPress={onClose}
              titleStyle={styles.closeButton}
            />
          </View>
          
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(order.status) }]}>
            <Text style={styles.statusText}>{getStatusLabel(order.status)}</Text>
          </View>
        </Card>

        <Card>
          <Text style={styles.sectionTitle}>Илгээгчийн Мэдээлэл</Text>
          <ListItem>
            <ListItem.Content>
              <ListItem.Title>Нэр:</ListItem.Title>
              <ListItem.Subtitle>{order.customer_name}</ListItem.Subtitle>
            </ListItem.Content>
          </ListItem>
          
          {order.customer_phone && (
            <ListItem>
              <ListItem.Content>
                <ListItem.Title>Утасны Дугаар:</ListItem.Title>
                <ListItem.Subtitle>{order.customer_phone}</ListItem.Subtitle>
              </ListItem.Content>
            </ListItem>
          )}
        </Card>

        <Card>
          <Text style={styles.sectionTitle}>Хүлээн Авагчийн Мэдээлэл</Text>
          {order.receiver_name && (
            <ListItem>
              <ListItem.Content>
                <ListItem.Title>Нэр:</ListItem.Title>
                <ListItem.Subtitle>{order.receiver_name}</ListItem.Subtitle>
              </ListItem.Content>
            </ListItem>
          )}
          
          {order.receiver_phone && (
            <ListItem>
              <ListItem.Content>
                <ListItem.Title>Утасны Дугаар:</ListItem.Title>
                <ListItem.Subtitle>{order.receiver_phone}</ListItem.Subtitle>
              </ListItem.Content>
            </ListItem>
          )}
        </Card>

        <Card>
          <Text style={styles.sectionTitle}>Хүргэлтийн Мэдээллүүд</Text>
          <ListItem>
            <ListItem.Content>
              <ListItem.Title>Хүлээн Авсан Хаяг:</ListItem.Title>
              <ListItem.Subtitle>{order.pickup_address}</ListItem.Subtitle>
            </ListItem.Content>
          </ListItem>
        </Card>

        <Card>
          <Text style={styles.sectionTitle}>Ачааны Мэдээлэл</Text>
          {order.cargo_type && (
            <ListItem>
              <ListItem.Content>
                <ListItem.Title>Төрөл:</ListItem.Title>
                <ListItem.Subtitle>{order.cargo_type}</ListItem.Subtitle>
              </ListItem.Content>
            </ListItem>
          )}
          
          {order.weight && (
            <ListItem>
              <ListItem.Content>
                <ListItem.Title>Жин:</ListItem.Title>
                <ListItem.Subtitle>{order.weight} kg</ListItem.Subtitle>
              </ListItem.Content>
            </ListItem>
          )}

          {order.price && (
            <ListItem>
              <ListItem.Content>
                <ListItem.Title>Үнэ:</ListItem.Title>
                <ListItem.Subtitle>{order.price} ₮</ListItem.Subtitle>
              </ListItem.Content>
            </ListItem>
          )}
          
          {order.notes && (
            <ListItem>
              <ListItem.Content>
                <ListItem.Title>Нэмэлт Тэмдэглэл:</ListItem.Title>
                <ListItem.Subtitle>{order.notes}</ListItem.Subtitle>
              </ListItem.Content>
            </ListItem>
          )}
        </Card>
        
        {statusOptions.length > 0 && (
          <Card>
            <Text style={styles.sectionTitle}>Төлөв Шинчлэх</Text>
            <View style={styles.statusButtons}>
              {statusOptions.map((status) => (
                <Button
                  key={status}
                  title={status.label.toUpperCase()}
                  onPress={() => handleStatusUpdate(status.value)}
                  disabled={order.status === status || updating}
                  buttonStyle={[
                    styles.statusButton,
                    { backgroundColor: getStatusColor(status.value) },
                    order.status === status.value && styles.activeStatus
                  ]}
                />
              ))}
            </View>
          </Card>
        )}

        {statusOptions.length === 0 && userRole !== 'executive' && (
          <Card>
            <Text style={styles.infoText}>
              Зөвхөн удирдлага төлвийг өөрчлөх боломжтой
            </Text>
          </Card>
        )}

        <Card>
          <Text style={styles.timestamp}>
            Үүссэн Огноо: {new Date(order.created_at).toLocaleString()}
          </Text>
          {order.updated_at && (
            <Text style={styles.timestamp}>
              Шинчлэсэн Огноо: {new Date(order.updated_at).toLocaleString()}
            </Text>
          )}
        </Card>
        <Divider margin={20} />
      </ScrollView>
    </Overlay>
  );
};

const styles = StyleSheet.create({
  overlay: {
    padding: 5,
    margin: 0,
  },
  headerCard: {
    marginTop: 70,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  closeButton: {
    fontSize: 24,
    color: '#666',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
    alignSelf: 'flex-start',
    marginTop: 10,
  },
  statusText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  statusButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statusButton: {
    marginVertical: 5,
    width: '60%',
  },
  activeStatus: {
    opacity: 0.6,
  },
  timestamp: {
    fontSize: 12,
    color: '#666',
    marginTop: 5,
  },
});