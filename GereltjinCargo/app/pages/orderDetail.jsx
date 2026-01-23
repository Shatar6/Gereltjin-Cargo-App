import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert, Modal, ActivityIndicator  } from 'react-native';
import { Text, Button, Card, ListItem, Overlay, Divider , Icon} from 'react-native-elements';
import { ordersService } from '../services/api';
import * as SecureStore from 'expo-secure-store';

export const OrderDetailModal = ({ visible, order, onClose, onStatusUpdate }) => {
  const [updating, setUpdating] = useState(false);
  const [userRole, setUserRole] = useState('worker');
  const [orderHistory, setOrderHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  
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

  useEffect(() => {
    loadUserRole();
  }, [])

  useEffect(() => {
    if (visible && order && userRole === 'executive') {
      loadOrderHistory();
    }
  }, [visible, order, userRole]);
  
  const loadOrderHistory = async () => {
    if (!order) return;
    
    setLoadingHistory(true);
    try {
      const history = await ordersService.getOrderHistory(order.id);
      setOrderHistory(history);
    } catch (error) {
      console.error('Error loading order history:', error);
    } finally {
      setLoadingHistory(false);
    }
  };

  if (!order) return null;


  const getStatusOptions = () => {
    if (userRole === 'executive') {
      // Executives can set any status
      return [
        { value: 'received_package', label: 'Хүлээж Авсан' },
        { value: 'payment_paid', label: 'Төлбөр Төлсөн' },
        { value: 'delivered', label: 'Хүргэгдсэн' },
        { value: 'cancelled', label: 'Цуцлагдсан' }
      ];
    } else {
      // Workers can only set to payment_paid if current status is received_package
      if (order.status === 'received_package') {
        return [
          { value: 'payment_paid', label: 'Төлбөр Төлсөн' }
        ];
      }
      return []; // No options if already payment_paid or beyond
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
              console.log("Updating order", order.id, "to status", newStatus);
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
      case 'payment_paid': 
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
      case 'payment_paid': 
        return 'Төлбөр Төлсөн';
      case 'delivered': 
        return 'Хүргэгдсэн';
      case 'cancelled':
        return 'Цуцлагдсан';
      default: 
        return status;
    }
  };

  const getActionLabel = (action) => {
    switch (action) {
      case 'created': return 'Үүсгэсэн';
      case 'status_changed': return 'Төлөв өөрчилсөн';
      case 'updated': return 'Шинэчилсэн';
      default: return action;
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
              type="clear"
              onPress={onClose}
              titleStyle={styles.closeButton}
            />
          </View>
          
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(order.status) }]}>
            <Text style={styles.statusText}>{getStatusLabel(order.status)}</Text>
          </View>
        </Card>
        {/* Sender Information */}
        <Card>
          <Text style={styles.sectionTitle}>Илгээгчийн Мэдээлэл</Text>
          <ListItem key="sender-name">
            <ListItem.Content>
              <ListItem.Title>Нэр: {order.customer_name}</ListItem.Title>
            </ListItem.Content>
          </ListItem>
          
          {order.customer_phone && (
            <ListItem key="sender-phone">
              <ListItem.Content>
                <ListItem.Title>Утасны дугаар: {order.customer_phone}</ListItem.Title>
              </ListItem.Content>
            </ListItem>
          )}
        </Card>

        <Card>
          <Text style={styles.sectionTitle}>Хүлээн Авагчийн Мэдээлэл</Text>
          {order.receiver_name && (
            <ListItem key="receiver-name">
              <ListItem.Content>
                <ListItem.Title>Нэр: {order.receiver_name}</ListItem.Title>
              </ListItem.Content>
            </ListItem>
          )}
          
          {order.receiver_phone && (
            <ListItem key="receiver-phone">
              <ListItem.Content>
                <ListItem.Title>Утасны дугаар: {order.receiver_phone}</ListItem.Title>
              </ListItem.Content>
            </ListItem>
          )}
        </Card>

        <Card>
          <Text style={styles.sectionTitle}>Хүргэлтийн Мэдээллүүд</Text>
          <ListItem key="pickup-address">
            <ListItem.Content>
              <ListItem.Title>Хүлээн авсан хаяг:   {order.pickup_address}</ListItem.Title> 
            </ListItem.Content>
          </ListItem>
        </Card>

        <Card>
          <Text style={styles.sectionTitle}>Ачааны Мэдээлэл</Text>
          {order.cargo_type && (
            <ListItem key="cargo-type">
              <ListItem.Content>
                <ListItem.Title>Төрөл:</ListItem.Title>
                <ListItem.Subtitle>{order.cargo_type}</ListItem.Subtitle>
              </ListItem.Content>
            </ListItem>
          )}
          
          {order.weight && (
            <ListItem key="weight">
              <ListItem.Content>
                <ListItem.Title>Жин:</ListItem.Title>
                <ListItem.Subtitle>{order.weight} kg</ListItem.Subtitle>
              </ListItem.Content>
            </ListItem>
          )}

          {order.price && (
            <ListItem key="price">
              <ListItem.Content>
                <ListItem.Title>Үнэ:</ListItem.Title>
                <ListItem.Subtitle>{order.price} ₮</ListItem.Subtitle>
              </ListItem.Content>
            </ListItem>
          )}
          
          {order.notes && (
            <ListItem key="notes">
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
                  key={status.value}
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

         {/* Order History - Only for Executives */}
        {userRole === 'executive' && (
          <Card>
            <View style={styles.historyHeader}>
              <Text style={styles.sectionTitle}>Өөрчлөлтийн Түүх</Text>
              <Button
                title={showHistory ? "Нуух" : "Харах"}
                type="clear"
                onPress={() => setShowHistory(!showHistory)}
                icon={
                  <Icon
                    name={showHistory ? "keyboard-arrow-up" : "keyboard-arrow-down"}
                    type="material"
                    size={20}
                  />
                }
              />
            </View>
            
            {showHistory && (
              <>
                {loadingHistory ? (
                  <ActivityIndicator size="small" color="#2196F3" />
                ) : orderHistory.length > 0 ? (
                  orderHistory.map((item, index) => (
                    <View key={item.id || index} style={styles.historyItem}>
                      <View style={styles.historyItemHeader}>
                        <Text style={styles.historyWorker}>{item.worker_name}</Text>
                        <Text style={styles.historyDate}>
                          {new Date(item.created_at).toLocaleString('mn-MN')}
                        </Text>
                      </View>
                      <Text style={styles.historyAction}>{getActionLabel(item.action)}</Text>
                      {item.old_status && item.new_status && (
                        <Text style={styles.historyStatusChange}>
                          {getStatusLabel(item.old_status)} → {getStatusLabel(item.new_status)}
                        </Text>
                      )}
                    </View>
                  ))
                ) : (
                  <Text style={styles.emptyHistory}>Түүх олдсонгүй</Text>
                )}
              </>
            )}
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
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  historyItem: {
    backgroundColor: '#f5f5f5',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  historyItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  historyWorker: {
    fontWeight: 'bold',
    fontSize: 14,
    color: '#333',
  },
  historyDate: {
    fontSize: 12,
    color: '#666',
  },
  historyAction: {
    fontSize: 13,
    color: '#555',
    marginTop: 2,
  },
  historyStatusChange: {
    fontSize: 13,
    color: '#2196F3',
    marginTop: 4,
    fontStyle: 'italic',
  },
  emptyHistory: {
    textAlign: 'center',
    color: '#999',
    fontStyle: 'italic',
    marginTop: 10,
  },
});