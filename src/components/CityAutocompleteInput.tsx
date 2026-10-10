import React, { useEffect, useState, useRef } from 'react';
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { CityResult, searchCities } from '../lib/city-search';

interface CityAutocompleteInputProps {
  label?: string;
  placeholder?: string;
  value: string;
  onChangeText: (text: string) => void;
  style?: any;
}

export function CityAutocompleteInput({
  label,
  placeholder = 'Type city name...',
  value,
  onChangeText,
  style,
}: CityAutocompleteInputProps) {
  const [suggestions, setSuggestions] = useState<CityResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const isSelectedRef = useRef(false);
  const debounceTimer = useRef<any>(null);

  const handleTextChange = (text: string) => {
    isSelectedRef.current = false;
    onChangeText(text);
  };

  useEffect(() => {
    // If the value change was triggered by selecting an item, don't re-query
    if (isSelectedRef.current) {
      setSuggestions([]);
      setShowDropdown(false);
      return;
    }

    if (!value || value.trim().length < 2) {
      setSuggestions([]);
      setShowDropdown(false);
      return;
    }

    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    debounceTimer.current = setTimeout(async () => {
      setLoading(true);
      try {
        const results = await searchCities(value);
        if (!isSelectedRef.current) {
          setSuggestions(results);
          setShowDropdown(results.length > 0);
        }
      } catch (err) {
        console.error('Error fetching city suggestions:', err);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, [value]);

  const handleSelectCity = (city: CityResult) => {
    isSelectedRef.current = true;
    onChangeText(city.displayName);
    setShowDropdown(false);
    setSuggestions([]);
  };

  return (
    <View style={[styles.container, style]}>
      {label && <Text style={styles.label}>{label}</Text>}
      <View style={styles.inputWrapper}>
        <TextInput
          style={styles.input}
          placeholder={placeholder}
          placeholderTextColor="#999"
          value={value}
          onChangeText={handleTextChange}
          onFocus={() => {
            if (suggestions.length > 0 && !isSelectedRef.current) {
              setShowDropdown(true);
            }
          }}
        />
        {loading ? (
          <ActivityIndicator size="small" color="#8B1E3F" style={styles.rightIcon} />
        ) : value ? (
          <TouchableOpacity
            style={styles.rightIcon}
            onPress={() => {
              isSelectedRef.current = false;
              onChangeText('');
              setSuggestions([]);
              setShowDropdown(false);
            }}
          >
            <Text style={{ fontSize: 14, color: '#999' }}>✕</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      {showDropdown && suggestions.length > 0 && (
        <View style={styles.dropdown}>
          {suggestions.map((item, index) => (
            <TouchableOpacity
              key={`${item.displayName}-${index}`}
              style={[
                styles.dropdownItem,
                index === suggestions.length - 1 && { borderBottomWidth: 0 },
              ]}
              onPress={() => handleSelectCity(item)}
            >
              <Text style={styles.itemTitle}>📍 {item.name}</Text>
              <Text style={styles.itemSub}>
                {[item.state, item.country].filter(Boolean).join(', ')}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 14,
    zIndex: 999, // Ensure dropdown overlays subsequent form fields
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#2C1B1F',
    marginBottom: 6,
  },
  inputWrapper: {
    position: 'relative',
    justifyContent: 'center',
  },
  input: {
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#EFEAE2',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#2C1B1F',
    paddingRight: 40,
  },
  rightIcon: {
    position: 'absolute',
    right: 14,
    alignSelf: 'center',
  },
  dropdown: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#EFEAE2',
    borderRadius: 12,
    marginTop: 4,
    maxHeight: 200,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  dropdownItem: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  itemTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
  },
  itemSub: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
    marginLeft: 20,
  },
});
