const NotificationManager = require('./services/notificationManager');
const ConfigManager = require('../database/configStore');

let notificationManager = null;
const configManager = new ConfigManager();

// Initialize notification manager
async function initialize() {
  try {
    if (!notificationManager) {
      notificationManager = new NotificationManager();
    }
    
    const config = configManager.getConfig();
    await notificationManager.initialize(config);
    console.log('✅ Notification services initialized');
    return true;
  } catch (error) {
    console.error('Failed to initialize notification services:', error.message);
    return false;
  }
}

// Reinitialize with new config (called when settings change)
async function reinitialize() {
  try {
    if (!notificationManager) {
      return await initialize();
    }
    
    const config = configManager.getConfig();
    await notificationManager.reinitialize(config);
    console.log('✅ Notification services reinitialized');
    return true;
  } catch (error) {
    console.error('Failed to reinitialize notification services:', error.message);
    return false;
  }
}

// Send signal notification
async function sendSignalMessage(signal) {
  try {
    if (!notificationManager) {
      console.warn('Notification manager not initialized, skipping signal message');
      return;
    }
    
    const result = await notificationManager.sendSignal(signal);
    if (result.success) {
      console.log(`📤 Signal notification sent for ${signal.symbol}`);
    } else {
      console.warn(`⚠️ Failed to send signal notification: ${result.message}`);
    }
  } catch (error) {
    console.error('Error sending signal message:', error.message);
  }
}

// Send order notification
async function sendOrderMessage(order) {
  try {
    if (!notificationManager) {
      console.warn('Notification manager not initialized, skipping order message');
      return;
    }
    
    const result = await notificationManager.sendOrderSuccess(order);
    if (result.success) {
      console.log(`📤 Order notification sent for ${order.symbol}`);
    } else {
      console.warn(`⚠️ Failed to send order notification: ${result.message}`);
    }
  } catch (error) {
    console.error('Error sending order message:', error.message);
  }
}

// Send position closed notification
async function sendPositionClosedMessage(position) {
  try {
    if (!notificationManager) {
      console.warn('Notification manager not initialized, skipping position closed message');
      return;
    }
    
    const result = await notificationManager.sendPositionClosed(position);
    if (result.success) {
      console.log(`📤 Position closed notification sent for ${position.symbol}`);
    } else {
      console.warn(`⚠️ Failed to send position closed notification: ${result.message}`);
    }
  } catch (error) {
    console.error('Error sending position closed message:', error.message);
  }
}

// Send generic message
async function sendMessage(message, type = 'info') {
  try {
    if (!notificationManager) {
      console.warn('Notification manager not initialized, skipping message');
      return;
    }
    
    const result = await notificationManager.broadcast(message, type);
    if (result.success) {
      console.log('📤 Message broadcast sent');
    } else {
      console.warn(`⚠️ Failed to broadcast message: ${result.message}`);
    }
  } catch (error) {
    console.error('Error sending message:', error.message);
  }
}

// Send scan summary
async function sendScanSummary(summary) {
  try {
    if (!notificationManager) {
      return;
    }
    
    await notificationManager.sendScanSummary(summary);
  } catch (error) {
    console.error('Error sending scan summary:', error.message);
  }
}

// Send error alert
async function sendErrorAlert(error) {
  try {
    if (!notificationManager) {
      return;
    }
    
    await notificationManager.sendError(error);
  } catch (error) {
    console.error('Error sending error alert:', error.message);
  }
}

// Get connection status
function getConnectionStatus() {
  if (!notificationManager) {
    return { discord: false, telegram: false };
  }
  return notificationManager.getConnectionStatus();
}

// Test connections
async function testConnections(config = null) {
  if (!notificationManager) {
    return { discord: { success: false }, telegram: { success: false } };
  }
  
  // Nếu có config được truyền vào, tạo notification manager tạm thời
  if (config) {
    const NotificationManager = require('./services/notificationManager');
    const tempNotificationManager = new NotificationManager();
    await tempNotificationManager.initialize(config);
    return await tempNotificationManager.testConnections();
  }
  
  return await notificationManager.testConnections();
}

module.exports = {
  initialize,
  reinitialize,
  sendSignalMessage,
  sendOrderMessage,
  sendPositionClosedMessage,
  sendMessage,
  sendScanSummary,
  sendErrorAlert,
  getConnectionStatus,
  testConnections,
  getManager: () => notificationManager,
};
