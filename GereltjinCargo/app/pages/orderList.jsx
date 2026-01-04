import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, FlatList, Alert, RefreshControl } from 'react-native';
import { SearchBar, ListItem, Button, Text, Header } from 'react-native-elements';
import { ordersService, authService } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useFocusEffect } from '@react-navigation/native';
import { OrderDetailModal } from './orderDetail';

export const OrdersListScreen = ({ navigation }) => {
  const [orders, setOrders] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const { logout, user } = useAuth();
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);

  const loadOrders = async (searchTerm = '') => {
    try {
      setLoading(true);
      const data = await ordersService.getOrders(searchTerm);
      setOrders(data);
    } catch (error) {
      Alert.alert('Error', 'Failed to load orders');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Reload orders when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      loadOrders(search);
    }, [search])
  );

  useEffect(() => {
    loadOrders();
  }, []);

  const handleSearch = (text) => {
    setSearch(text);
    loadOrders(text);
  };

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Logout', 
          style: 'destructive',
          onPress: async () => {
            await authService.logout();
            logout();
          }
        }
      ]
    );
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadOrders(search);
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'pending': return '#FFA500';
      case 'in-transit': return '#2196F3';
      case 'delivered': return '#4CAF50';
      default: return '#757575';
    }
  };

  const renderOrder = ({ item }) => (
    <ListItem bottomDivider={true} 
        containerStyle={styles.listItem} 
        onPress={() => {
            setSelectedOrder(item);
            setDetailModalVisible(true);
        }}>
      <ListItem.Content>
        <View style={styles.orderHeader}>
          <ListItem.Title style={styles.orderNumber}>
            {item.orderNumber}
          </ListItem.Title>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
            <Text style={styles.statusText}>{item.status || 'Pending'}</Text>
          </View>
        </View>
        
        <ListItem.Subtitle style={styles.customerName}>
          Customer: {item.customerName}
        </ListItem.Subtitle>
        
        <Text style={styles.address}>From: {item.pickupAddress}</Text>
        <Text style={styles.address}>To: {item.deliveryAddress}</Text>
        
        {item.cargoType && (
          <Text style={styles.cargoInfo}>Type: {item.cargoType}</Text>
        )}
        
        {item.weight && (
          <Text style={styles.cargoInfo}>Weight: {item.weight} kg</Text>
        )}
        
        <Text style={styles.date}>
          Created: {new Date(item.createdAt).toLocaleDateString()}
        </Text>
      </ListItem.Content>
      <ListItem.Chevron />
    </ListItem>
  );

  return (
    <View style={styles.container}>
      <Header
        centerComponent={{ text: `Welcome, ${user?.name}`, style: { color: '#fff' } }}
        rightComponent={
          <Button
            title="Logout"
            onPress={handleLogout}
            type="clear"
            titleStyle={{ color: '#fff' }}
            icon={{ name: 'logout', type: 'material', color: '#fff' }}
          />
        }
        backgroundColor="#2196F3"
      />
      
      <SearchBar
        placeholder="Search by order # or customer..."
        onChangeText={handleSearch}
        value={search}
        platform="default"
        containerStyle={styles.searchBar}
        inputContainerStyle={styles.searchInput}
      />
      
      {orders.length === 0 && !loading ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No orders found</Text>
        </View>
      ) : (
        <FlatList
          data={orders}
          renderItem={renderOrder}
          keyExtractor={(item) => item.id}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        />
      )}
      <OrderDetailModal
            visible={detailModalVisible}
            order={selectedOrder}
            onClose={() => {
                setDetailModalVisible(false);
                setSelectedOrder(null);
            }}
            onStatusUpdate={() => {
                loadOrders(search);
            }}
        />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  searchBar: {
    backgroundColor: '#fff',
    borderBottomColor: 'transparent',
    borderTopColor: 'transparent',
  },
  searchInput: {
    backgroundColor: '#f0f0f0',
  },
  listItem: {
    backgroundColor: '#fff',
    marginVertical: 2,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
  },
  orderNumber: {
    fontWeight: 'bold',
    fontSize: 16,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  customerName: {
    fontSize: 14,
    marginTop: 4,
    fontWeight: '600',
  },
  address: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  cargoInfo: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  date: {
    fontSize: 11,
    color: '#999',
    marginTop: 4,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
  },
});