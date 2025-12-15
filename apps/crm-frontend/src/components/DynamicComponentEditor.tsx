/**
 * DynamicComponentEditor
 * Auto-generates form fields based on component JSONB data structure
 */

import React, { useState, useEffect, useRef } from 'react';
import { useAuth as useClerkAuth } from '@clerk/clerk-react';
import './DynamicComponentEditor.css';
import {
  parseComponentData,
  setNestedValue,
  getNestedValue,
  type DynamicField,
} from '../utils/dynamicFieldParser';
import type { ComponenteSchema } from '../services/api';
import { uploadComponentImage } from '../services/api';

interface DynamicComponentEditorProps {
  datos: any;
  onChange: (newDatos: any) => void;
  schema?: ComponenteSchema | null; // Schema del catálogo
  tenantId?: string; // ID del tenant para subir imágenes
}

const DynamicComponentEditor: React.FC<DynamicComponentEditorProps> = ({ datos, onChange, schema, tenantId }) => {
  const { getToken } = useClerkAuth();
  const fileInputRefs = useRef<{ [key: string]: HTMLInputElement | null }>({});
  const [uploadingImages, setUploadingImages] = useState<{ [key: string]: boolean }>({});

  const [parsedFields, setParsedFields] = useState<{
    staticFields: DynamicField[];
    toggleFields: DynamicField[];
    styleFields: DynamicField[];
  }>({ staticFields: [], toggleFields: [], styleFields: [] });

  useEffect(() => {
    // Si hay schema del catálogo, usarlo; si no, parsear de datos existentes
    if (schema && schema.campos) {
      console.log('📋 [DynamicComponentEditor] Usando schema del catálogo:', schema);
      console.log('📋 [DynamicComponentEditor] Número de campos:', schema.campos.length);

      const staticFields: DynamicField[] = schema.campos.map(campo => {
        // Si es un array, convertir schema a children
        let children: DynamicField['children'] = undefined;
        if (campo.tipo === 'array' && campo.schema) {
          children = Object.entries(campo.schema).map(([key, fieldDef]: [string, any]) => ({
            key,
            label: fieldDef.label || key.charAt(0).toUpperCase() + key.slice(1),
            type: fieldDef.type || 'text',
            path: ['static_data', campo.nombre, '0', key],
            value: '',
          }));
        }

        return {
          key: campo.nombre,
          path: ['static_data', campo.nombre],
          label: campo.label || campo.nombre,
          type: campo.tipo as any,
          value: getNestedValue(datos, ['static_data', campo.nombre]) ?? campo.default,
          children,
          opciones: campo.opciones,
        };
      });

      const toggleFields: DynamicField[] = (schema.toggles || []).map(toggle => ({
        key: toggle.nombre,
        path: ['toggles', toggle.nombre],
        label: toggle.label || toggle.nombre,
        type: 'boolean' as const,  // Forzar tipo boolean para toggles
        value: getNestedValue(datos, ['toggles', toggle.nombre]) ?? toggle.default,
      }));

      console.log('📋 [DynamicComponentEditor] Static fields generados:', staticFields.length);
      console.log('📋 [DynamicComponentEditor] Toggle fields generados:', toggleFields.length);
      console.log('📋 [DynamicComponentEditor] Schema toggles recibidos:', schema.toggles);
      console.log('📋 [DynamicComponentEditor] Toggle fields mapeados:', toggleFields);

      setParsedFields({
        staticFields,
        toggleFields,
        styleFields: [], // Por ahora no manejamos styles desde schema
      });
    } else {
      console.log('⚠️ [DynamicComponentEditor] Sin schema, parseando de datos existentes');
      // Fallback: parsear de datos existentes
      const parsed = parseComponentData(datos);
      setParsedFields(parsed);
    }
  }, [datos, schema]);

  const handleFieldChange = (path: string[], value: any) => {
    const newDatos = setNestedValue(datos, path, value);
    onChange(newDatos);
  };

  const handleArrayItemChange = (basePath: string[], itemIndex: number, field: string, value: any) => {
    const arrayPath = basePath;
    const currentArray = getNestedValue(datos, arrayPath) || [];
    const newArray = [...currentArray];

    if (newArray[itemIndex]) {
      newArray[itemIndex] = {
        ...newArray[itemIndex],
        [field]: value,
      };
    }

    const newDatos = setNestedValue(datos, arrayPath, newArray);
    onChange(newDatos);
  };

  const handleArrayAdd = (path: string[], template: any) => {
    const currentArray = getNestedValue(datos, path) || [];
    const newItem = typeof template === 'object' && !Array.isArray(template)
      ? { ...template }
      : template || '';
    const newArray = [...currentArray, newItem];
    const newDatos = setNestedValue(datos, path, newArray);
    onChange(newDatos);
  };

  const handleArrayRemove = (path: string[], index: number) => {
    const currentArray = getNestedValue(datos, path) || [];
    const newArray = currentArray.filter((_: any, i: number) => i !== index);
    const newDatos = setNestedValue(datos, path, newArray);
    onChange(newDatos);
  };

  const handleImageUpload = async (path: string[], file: File) => {
    if (!tenantId) {
      alert('No se pudo obtener el ID del tenant');
      return;
    }

    const fieldKey = path.join('.');
    setUploadingImages(prev => ({ ...prev, [fieldKey]: true }));

    try {
      const token = await getToken();
      const result = await uploadComponentImage(tenantId, file, token);
      handleFieldChange(path, result.url);
    } catch (error: any) {
      console.error('Error subiendo imagen:', error);
      alert('Error al subir la imagen: ' + error.message);
    } finally {
      setUploadingImages(prev => ({ ...prev, [fieldKey]: false }));
    }
  };

  const renderField = (field: DynamicField): React.ReactNode => {
    const currentValue = getNestedValue(datos, field.path);

    switch (field.type) {
      case 'boolean':
        return (
          <div key={field.path.join('.')} className="form-group">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={!!currentValue}
                onChange={(e) => handleFieldChange(field.path, e.target.checked)}
              />
              <span>{field.label}</span>
            </label>
          </div>
        );

      case 'number':
        return (
          <div key={field.path.join('.')} className="form-group">
            <label>{field.label}</label>
            <input
              type="number"
              value={currentValue || 0}
              onChange={(e) => handleFieldChange(field.path, parseFloat(e.target.value) || 0)}
              className="form-control"
            />
          </div>
        );

      case 'textarea':
        return (
          <div key={field.path.join('.')} className="form-group">
            <label>{field.label}</label>
            <textarea
              value={currentValue || ''}
              onChange={(e) => handleFieldChange(field.path, e.target.value)}
              className="form-control"
              rows={4}
            />
          </div>
        );

      case 'image':
        const fieldKey = field.path.join('.');
        const isUploading = uploadingImages[fieldKey];
        return (
          <div key={fieldKey} className="form-group image-field">
            <label>{field.label}</label>

            {currentValue && (
              <div className="image-preview">
                <img src={currentValue} alt={field.label} style={{ maxWidth: '200px', marginBottom: '8px', borderRadius: '4px' }} />
              </div>
            )}

            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <input
                type="file"
                accept="image/*"
                ref={(el) => (fileInputRefs.current[fieldKey] = el)}
                style={{ display: 'none' }}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    handleImageUpload(field.path, file);
                  }
                }}
              />
              <button
                type="button"
                onClick={() => fileInputRefs.current[fieldKey]?.click()}
                className="btn-upload-image"
                disabled={isUploading}
                style={{
                  padding: '8px 16px',
                  backgroundColor: isUploading ? '#ccc' : '#007bff',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: isUploading ? 'not-allowed' : 'pointer',
                  fontSize: '14px',
                }}
              >
                {isUploading ? 'Subiendo...' : (currentValue ? 'Cambiar imagen' : 'Subir imagen')}
              </button>

              {currentValue && (
                <input
                  type="text"
                  value={currentValue}
                  onChange={(e) => handleFieldChange(field.path, e.target.value)}
                  className="form-control"
                  placeholder="URL de la imagen"
                  style={{ flex: 1 }}
                />
              )}
            </div>
          </div>
        );

      case 'url':
        return (
          <div key={field.path.join('.')} className="form-group">
            <label>{field.label}</label>
            <input
              type="text"
              value={currentValue || ''}
              onChange={(e) => handleFieldChange(field.path, e.target.value)}
              className="form-control"
              placeholder="URL"
            />
          </div>
        );

      case 'array':
        return (
          <div key={field.path.join('.')} className="form-group array-field">
            <label>{field.label}</label>
            <div className="array-items">
              {Array.isArray(currentValue) && currentValue.map((item: any, index: number) => (
                <div key={index} className="array-item">
                  <div className="array-item-header">
                    <strong>Item {index + 1}</strong>
                    <button
                      type="button"
                      onClick={() => handleArrayRemove(field.path, index)}
                      className="btn-remove"
                    >
                      ✕
                    </button>
                  </div>
                  {typeof item === 'object' && !Array.isArray(item) ? (
                    <div className="nested-fields">
                      {field.children?.map((childField) => {
                        const itemValue = item[childField.key];
                        return (
                          <div key={childField.key} className="form-group-compact">
                            <label>{childField.label}</label>
                            {childField.type === 'textarea' ? (
                              <textarea
                                value={itemValue || ''}
                                onChange={(e) => handleArrayItemChange(field.path, index, childField.key, e.target.value)}
                                className="form-control"
                                rows={2}
                              />
                            ) : childField.type === 'number' ? (
                              <input
                                type="number"
                                value={itemValue || 0}
                                onChange={(e) => handleArrayItemChange(field.path, index, childField.key, parseFloat(e.target.value) || 0)}
                                className="form-control"
                              />
                            ) : (
                              <input
                                type="text"
                                value={itemValue || ''}
                                onChange={(e) => handleArrayItemChange(field.path, index, childField.key, e.target.value)}
                                className="form-control"
                              />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <input
                      type="text"
                      value={item || ''}
                      onChange={(e) => {
                        const newArray = [...currentValue];
                        newArray[index] = e.target.value;
                        handleFieldChange(field.path, newArray);
                      }}
                      className="form-control"
                    />
                  )}
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={() => {
                const template = field.children
                  ? field.children.reduce((acc, child) => ({ ...acc, [child.key]: '' }), {})
                  : '';
                handleArrayAdd(field.path, template);
              }}
              className="btn-add"
            >
              + Agregar {field.label}
            </button>
          </div>
        );

      case 'object':
        return (
          <div key={field.path.join('.')} className="form-group object-field">
            <label className="section-label">{field.label}</label>
            <div className="nested-fields">
              {field.children?.map((childField) => renderField(childField))}
            </div>
          </div>
        );

      case 'select':
        return (
          <div key={field.path.join('.')} className="form-group">
            <label>{field.label}</label>
            <select
              value={currentValue || ''}
              onChange={(e) => handleFieldChange(field.path, e.target.value)}
              className="form-control"
            >
              <option value="">Seleccionar...</option>
              {(field.opciones || []).map((opcion: string) => (
                <option key={opcion} value={opcion}>
                  {opcion.charAt(0).toUpperCase() + opcion.slice(1)}
                </option>
              ))}
            </select>
          </div>
        );

      case 'text':
      default:
        return (
          <div key={field.path.join('.')} className="form-group">
            <label>{field.label}</label>
            <input
              type="text"
              value={currentValue || ''}
              onChange={(e) => handleFieldChange(field.path, e.target.value)}
              className="form-control"
            />
          </div>
        );
    }
  };

  return (
    <div className="dynamic-component-editor">
      {parsedFields.staticFields.length > 0 && (
        <div className="editor-section">
          <h3 className="section-title">Contenido</h3>
          {parsedFields.staticFields.map((field) => renderField(field))}
        </div>
      )}

      {parsedFields.toggleFields.length > 0 && (
        <div className="editor-section">
          <h3 className="section-title">Opciones</h3>
          {parsedFields.toggleFields.map((field) => renderField(field))}
        </div>
      )}

      {parsedFields.styleFields.length > 0 && (
        <div className="editor-section">
          <h3 className="section-title">Estilos</h3>
          {parsedFields.styleFields.map((field) => renderField(field))}
        </div>
      )}
    </div>
  );
};

export default DynamicComponentEditor;
