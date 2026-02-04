import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Colors } from '@/constants/Colors';
import { API_CONFIG, DEFAULT_TENANT_ID } from '@/constants/config';
import { Ionicons } from '@expo/vector-icons';

export default function TestConnectionScreen() {
  const router = useRouter();
  const [testing, setTesting] = useState(false);
  const [result, setResult] = useState<string>('');
  const [success, setSuccess] = useState<boolean | null>(null);

  const testConnection = async () => {
    setTesting(true);
    setResult('Testing connection...\n\n');
    setSuccess(null);

    try {
      // Test 1: Basic fetch
      setResult(prev => prev + `📡 Testing: ${API_CONFIG.BASE_URL}\n\n`);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const response = await fetch(`${API_CONFIG.BASE_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: 'test@test.com',
          password: 'test123',
          tenantId: DEFAULT_TENANT_ID,
        }),
        credentials: 'include',
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      setResult(prev => prev + `✅ Response received!\n`);
      setResult(prev => prev + `Status: ${response.status}\n`);
      setResult(prev => prev + `Status Text: ${response.statusText}\n\n`);

      const data = await response.json();
      setResult(prev => prev + `Response:\n${JSON.stringify(data, null, 2)}\n\n`);

      if (response.ok || response.status === 401 || response.status === 400) {
        setResult(prev => prev + `✅ Backend is reachable!\n`);
        setResult(prev => prev + `(Login failed is expected - we're just testing connection)\n`);
        setSuccess(true);
      } else {
        setResult(prev => prev + `⚠️ Unexpected response\n`);
        setSuccess(false);
      }

    } catch (error: any) {
      setSuccess(false);
      
      if (error.name === 'AbortError') {
        setResult(prev => prev + `❌ Connection timeout!\n\n`);
        setResult(prev => prev + `Possible issues:\n`);
        setResult(prev => prev + `1. Backend is not running\n`);
        setResult(prev => prev + `2. Backend is not accessible from network\n`);
        setResult(prev => prev + `3. Firewall is blocking connection\n`);
      } else if (error.message === 'Network request failed') {
        setResult(prev => prev + `❌ Network request failed!\n\n`);
        setResult(prev => prev + `Error: ${error.message}\n\n`);
        setResult(prev => prev + `Possible issues:\n`);
        setResult(prev => prev + `1. Backend not running on ${API_CONFIG.BASE_URL}\n`);
        setResult(prev => prev + `2. Phone and computer not on same WiFi\n`);
        setResult(prev => prev + `3. Backend not listening on 0.0.0.0\n`);
        setResult(prev => prev + `4. Firewall blocking port 5500\n`);
      } else {
        setResult(prev => prev + `❌ Error: ${error.message}\n\n`);
        setResult(prev => prev + `Full error: ${JSON.stringify(error, null, 2)}\n`);
      }
    } finally {
      setTesting(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Test API Connection</Text>
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>Current Configuration:</Text>
          <Text style={styles.infoText}>API URL: {API_CONFIG.BASE_URL}</Text>
          <Text style={styles.infoText}>Tenant ID: {DEFAULT_TENANT_ID}</Text>
        </View>

        <TouchableOpacity
          style={[styles.testButton, testing && styles.testButtonDisabled]}
          onPress={testConnection}
          disabled={testing}
        >
          {testing ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <>
              <Ionicons name="wifi" size={20} color="#FFF" style={styles.buttonIcon} />
              <Text style={styles.testButtonText}>Test Connection</Text>
            </>
          )}
        </TouchableOpacity>

        {result !== '' && (
          <View style={[
            styles.resultCard,
            success === true && styles.resultSuccess,
            success === false && styles.resultError,
          ]}>
            <View style={styles.resultHeader}>
              {success === true && <Ionicons name="checkmark-circle" size={24} color={Colors.success} />}
              {success === false && <Ionicons name="close-circle" size={24} color={Colors.error} />}
              <Text style={styles.resultTitle}>
                {success === true ? 'Connection Successful!' : success === false ? 'Connection Failed' : 'Testing...'}
              </Text>
            </View>
            <ScrollView style={styles.resultScroll}>
              <Text style={styles.resultText}>{result}</Text>
            </ScrollView>
          </View>
        )}

        <View style={styles.instructionsCard}>
          <Text style={styles.instructionsTitle}>📋 Backend Checklist:</Text>
          <Text style={styles.instructionText}>✓ Backend is running</Text>
          <Text style={styles.instructionText}>✓ Backend listening on 0.0.0.0:5500 (not localhost)</Text>
          <Text style={styles.instructionText}>✓ Phone and PC on same WiFi</Text>
          <Text style={styles.instructionText}>✓ Firewall allows port 5500</Text>
          <Text style={styles.instructionText}>✓ CORS enabled for all origins</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 50,
    paddingBottom: 16,
    paddingHorizontal: 16,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backButton: {
    padding: 8,
    marginRight: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.text,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  infoCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 12,
  },
  infoText: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 6,
    fontFamily: 'monospace',
  },
  testButton: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  testButtonDisabled: {
    opacity: 0.6,
  },
  buttonIcon: {
    marginRight: 8,
  },
  testButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  resultCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: Colors.border,
    maxHeight: 400,
  },
  resultSuccess: {
    borderColor: Colors.success,
  },
  resultError: {
    borderColor: Colors.error,
  },
  resultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  resultTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.text,
    marginLeft: 8,
  },
  resultScroll: {
    maxHeight: 300,
  },
  resultText: {
    fontSize: 13,
    color: Colors.text,
    fontFamily: 'monospace',
    lineHeight: 20,
  },
  instructionsCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  instructionsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 12,
  },
  instructionText: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 8,
    lineHeight: 20,
  },
});
