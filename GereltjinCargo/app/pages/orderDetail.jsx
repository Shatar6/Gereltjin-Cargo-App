import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert, ActivityIndicator, Image, TouchableOpacity, Modal, Dimensions  } from 'react-native';
import { Text, Button, Card, ListItem, Overlay, Divider, Icon } from 'react-native-elements';
import { ordersService } from '../services/api';
import * as SecureStore from 'expo-secure-store';

const { width, height } = Dimensions.get('window');

export const OrderDetailModal = ({ visible, order, onClose, onStatusUpdate }) => {
  const [updating, setUpdating] = useState(false);
  const [userRole, setUserRole] = useState('worker');
  const [orderHistory, setOrderHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false); // For photo zoom

  

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

  // Format date properly
  const formatDate = (dateString) => {
    try {
      if (!dateString) return 'Огноо тодорхойгүй';
      
      const date = new Date(dateString);
      
      // Check if date is valid
      if (isNaN(date.getTime())) {
        return 'Огноо тодорхойгүй';
      }
      
      // Format: 2024-01-30 14:30
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      
      return `${year}-${month}-${day} ${hours}:${minutes}`;
    } catch (error) {
      console.error('Error formatting date:', error);
      return 'Огноо тодорхойгүй';
    }
  };

  const getStatusOptions = () => {
    if (userRole === 'executive') {
      return [
        { value: 'received_package', label: 'Хүлээж Авсан' },
        { value: 'payment_paid', label: 'Төлбөр Төлсөн' },
        { value: 'delivered', label: 'Хүргэгдсэн' },
        { value: 'cancelled', label: 'Цуцлагдсан' }
      ];
    } else {
      if (order.status === 'received_package') {
        return [
          { value: 'payment_paid', label: 'Төлбөр Төлсөн' }
        ];
      }
      return [];
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
              Alert.alert('Амжилттай', 'Төлвийг амжилттай шинчиллээ');
              
              // Reload history if executive
              if (userRole === 'executive') {
                await loadOrderHistory();
              }
              
              onStatusUpdate();
              onClose();
            } catch (error) {
              console.error('Update error:', error);
              Alert.alert('Алдаа', error.response?.data?.message || 'Төлөв шинчлэхэд алдаа гарлаа!');
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
      case 'received_package': return '#2196F3';
      case 'payment_paid': return '#FF9800';
      case 'delivered': return '#4CAF50';
      case 'cancelled': return '#F44336';
      default: return '#757575';
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'received_package': return 'Хүлээж Авсан';
      case 'payment_paid': return 'Төлбөр Төлсөн';
      case 'delivered': return 'Хүргэгдсэн';
      case 'cancelled': return 'Цуцлагдсан';
      default: return status;
    }
  };

  const getActionLabel = (action) => {
    switch (action) {
      case 'created': return 'Үүсгэсэн';
      case 'status_changed': return 'Төлөв өөрчилсөн';
      case 'updated': return 'Шинчилсэн';
      default: return action;
    }
  };

  return (
    <>
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

          {/* Photo Display - FIXED */}
          {order.photo_url && (
            <Card>
              <Text style={styles.sectionTitle}>Ачааны Зураг</Text>
              <TouchableOpacity 
                onPress={() => setShowImageModal(true)}
                activeOpacity={0.8}
              >
                <Image 
                  source={{ uri: order.photo_url }} 
                  style={styles.orderPhoto}
                  resizeMode="cover"
                />
                <View style={styles.imageOverlay}>
                  <Icon name="zoom-in" type="material" color="#fff" size={30} />
                  <Text style={styles.imageHint}>Дарж томруулах</Text>
                </View>
              </TouchableOpacity>
            </Card>
          )}

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

          {/* Receiver Information */}
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

          {/* Cargo Information */}
          <Card>
            <Text style={styles.sectionTitle}>Ачааны Мэдээлэл</Text>
            {order.cargo_type && (
              <ListItem key="cargo-type">
                <ListItem.Content>
                  <ListItem.Title>Төрөл: {order.cargo_type}</ListItem.Title>
                </ListItem.Content>
              </ListItem>
            )}
            
            {order.weight && (
              <ListItem key="weight">
                <ListItem.Content>
                  <ListItem.Title>Жин: {order.weight} kg</ListItem.Title>
                </ListItem.Content>
              </ListItem>
            )}

            {order.price && (
              <ListItem key="price">
                <ListItem.Content>
                  <ListItem.Title>Үнэ: {order.price} ₮</ListItem.Title>
                </ListItem.Content>
              </ListItem>
            )}
            
            {order.notes && (
              <ListItem key="notes">
                <ListItem.Content>
                  <ListItem.Title>Нэмэлт Тэмдэглэл: {order.notes}</ListItem.Title>
                </ListItem.Content>
              </ListItem>
            )}
          </Card>
          
          {/* Status Update Buttons */}
          {statusOptions.length > 0 && (
            <Card>
              <Text style={styles.sectionTitle}>Төлөв Шинчлэх</Text>
              <View style={styles.statusButtons}>
                {statusOptions.map((status) => (
                  <Button
                    key={status.value}
                    title={status.label.toUpperCase()}
                    onPress={() => handleStatusUpdate(status.value)}
                    disabled={order.status === status.value || updating}
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

          {/* Order History - FIXED */}
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
                          <Text style={styles.historyWorker}>
                            {item.worker_name || 'Тодорхойгүй'}
                          </Text>
                          <Text style={styles.historyDate}>
                            {formatDate(item.created_at)}
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

          {/* Timestamps - FIXED */}
          <Card>
            <Text style={styles.timestamp}>
              Үүссэн: {formatDate(order.created_at)}
            </Text>
            {order.updated_at && (
              <Text style={styles.timestamp}>
                Шинчлэсэн: {formatDate(order.updated_at)}
              </Text>
            )}
          </Card>
          <Divider margin={20} />
        </ScrollView>
      </Overlay>

      {/* Image Zoom Modal */}
      <Modal
        visible={showImageModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowImageModal(false)}
      >
        <View style={styles.imageModalContainer}>
          <TouchableOpacity 
            style={styles.imageModalClose}
            onPress={() => setShowImageModal(false)}
            activeOpacity={0.8}
          >
            <View style={styles.closeButtonContainer}>
              <Icon name="close" type="material" color="#fff" size={30} />
            </View>
          </TouchableOpacity>
          
          <ScrollView
            contentContainerStyle={styles.imageModalContent}
            maximumZoomScale={3}
            minimumZoomScale={1}
          >
            <Image 
              source={{ uri: order.photo_url }} 
              style={styles.zoomedImage}
              resizeMode="contain"
            />
          </ScrollView>
        </View>
      </Modal>
    </>
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
  
  // Photo styles
  orderPhoto: {
    width: '100%',
    height: 250,
    borderRadius: 10,
    backgroundColor: '#f0f0f0',
  },
  imageOverlay: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  imageHint: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 5,
  },
  
  // Image Modal styles
  imageModalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageModalClose: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 10,
  },
  closeButtonContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 25,
    padding: 8,
  },
  imageModalContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  zoomedImage: {
    width: width*0.9,
    height: height,
  },
  
  statusButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 10,
  },
  statusButton: {
    marginVertical: 5,
    minWidth: '45%',
  },
  activeStatus: {
    opacity: 0.6,
  },
  infoText: {
    textAlign: 'center',
    color: '#666',
    fontStyle: 'italic',
    fontSize: 14,
  },
  timestamp: {
    fontSize: 12,
    color: '#666',
    marginTop: 5,
  },
  
  // History styles
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