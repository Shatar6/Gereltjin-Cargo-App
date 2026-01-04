import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Alert, Modal } from 'react-native';
import { Text, Button, Card, ListItem, Overlay } from 'react-native-elements';
import { ordersService } from '../services/api';

export const OrderDetailModal = ({ visible, order, onClose, onStatusUpdate }) => {
  const [updating, setUpdating] = useState(false);

  if (!order) return null;

  const statusOptions = ['Хүлээгдэж Байгаа', 'Хүргэлтэнд Байгаа', 'Хүргэгдсэн', 'Цуцлагдсан'];

  const handleStatusUpdate = async (newStatus) => {
    Alert.alert(
      'Төлөв Шинчлэх',
      `Change status to ${newStatus}?`,
      [
        { text: 'Цуцлах', style: 'cancel' },
        {
          text: 'Шинчлэх',
          onPress: async () => {
            setUpdating(true);
            try {
              await ordersService.updateStatus(order.id, newStatus);
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
    switch (status?.toLowerCase()) {
      case 'Хүлээгдэж Байгаа': return '#FFA500';
      case 'Хүргэлтэнд Байгаа': return '#2196F3';
      case 'Хүргэгдсэн': return '#4CAF50';
      case 'Цуцлагдсан': return '#F44336';
      default: return '#757575';
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
            <Text h4>{order.orderNumber}</Text>
            <Button
              title="✕"
              type="арилгах"
              onPress={onClose}
              titleStyle={styles.closeButton}
            />
          </View>
          
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(order.status) }]}>
            <Text style={styles.statusText}>{order.status?.toUpperCase()}</Text>
          </View>
        </Card>

        <Card>
          <Text style={styles.sectionTitle}>Үйлчлүүлэгчийн Мэдээлэл</Text>
          <ListItem>
            <ListItem.Content>
              <ListItem.Title>Нэр</ListItem.Title>
              <ListItem.Subtitle>{order.customerName}</ListItem.Subtitle>
            </ListItem.Content>
          </ListItem>
          
          {order.customerPhone && (
            <ListItem>
              <ListItem.Content>
                <ListItem.Title>Утасны Дугаар</ListItem.Title>
                <ListItem.Subtitle>{order.customerPhone}</ListItem.Subtitle>
              </ListItem.Content>
            </ListItem>
          )}
        </Card>

        <Card>
          <Text style={styles.sectionTitle}>Хүргэлтийн Мэдээллүүд</Text>
          <ListItem>
            <ListItem.Content>
              <ListItem.Title>Хүлээн Авсан Хаяг</ListItem.Title>
              <ListItem.Subtitle>{order.pickupAddress}</ListItem.Subtitle>
            </ListItem.Content>
          </ListItem>
          
        </Card>

        <Card>
          <Text style={styles.sectionTitle}>Ачааны Мэдээлэл</Text>
          {order.cargoType && (
            <ListItem>
              <ListItem.Content>
                <ListItem.Title>Төрөл</ListItem.Title>
                <ListItem.Subtitle>{order.cargoType}</ListItem.Subtitle>
              </ListItem.Content>
            </ListItem>
          )}
          
          {order.weight && (
            <ListItem>
              <ListItem.Content>
                <ListItem.Title>Жин</ListItem.Title>
                <ListItem.Subtitle>{order.weight} kg</ListItem.Subtitle>
              </ListItem.Content>
            </ListItem>
          )}
          
          {order.notes && (
            <ListItem>
              <ListItem.Content>
                <ListItem.Title>Нэмэлт Тэмдэглэл</ListItem.Title>
                <ListItem.Subtitle>{order.notes}</ListItem.Subtitle>
              </ListItem.Content>
            </ListItem>
          )}
        </Card>

        <Card>
          <Text style={styles.sectionTitle}>Төлөв Шинчлэх</Text>
          <View style={styles.statusButtons}>
            {statusOptions.map((status) => (
              <Button
                key={status}
                title={status.toUpperCase()}
                onPress={() => handleStatusUpdate(status)}
                disabled={order.status === status || updating}
                buttonStyle={[
                  styles.statusButton,
                  { backgroundColor: getStatusColor(status) },
                  order.status === status && styles.activeStatus
                ]}
              />
            ))}
          </View>
        </Card>

        <Card>
          <Text style={styles.timestamp}>
            Үүссэн Огноо: {new Date(order.createdAt).toLocaleString()}
          </Text>
          {order.updatedAt && (
            <Text style={styles.timestamp}>
              Шинчлэсэн Огноо: {new Date(order.updatedAt).toLocaleString()}
            </Text>
          )}
        </Card>
      </ScrollView>
    </Overlay>
  );
};

const styles = StyleSheet.create({
  overlay: {
    padding: 0,
    margin: 0,
  },
  headerCard: {
    marginTop: 40,
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
    width: '48%',
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