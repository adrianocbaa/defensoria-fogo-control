import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Nucleus, FireExtinguisher, Document } from '@/types/nucleus';

export function useNuclei() {
  const [nuclei, setNuclei] = useState<Nucleus[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  // Fetch all nuclei with their fire extinguishers, hydrants and documents
  const fetchNuclei = async () => {
    try {
      setLoading(true);
      
      // Fetch nuclei
      const { data: nucleiData, error: nucleiError } = await supabase
        .from('nuclei')
        .select('*')
        .order('created_at', { ascending: false });

      if (nucleiError) throw nucleiError;

      // Fetch fire extinguishers
      const { data: extinguishersData, error: extinguishersError } = await supabase
        .from('fire_extinguishers')
        .select('*');

      if (extinguishersError) throw extinguishersError;

      // Fetch hydrants
      const { data: hydrantsData, error: hydrantsError } = await supabase
        .from('hydrants')
        .select('*');

      if (hydrantsError) throw hydrantsError;

      // Fetch documents
      const { data: documentsData, error: documentsError } = await supabase
        .from('documents')
        .select('*');

      if (documentsError) throw documentsError;

      // Combine data
      const combinedNuclei: Nucleus[] = nucleiData.map(nucleus => {
        const combinedNucleus = {
          id: nucleus.id,
          name: nucleus.name,
          city: nucleus.city,
          address: nucleus.address,
          isAgentMode: nucleus.is_agent_mode || false,
          hydrants: hydrantsData
            .filter(hydrant => hydrant.nucleus_id === nucleus.id)
            .map(hydrant => ({
              id: hydrant.id,
              location: hydrant.location,
              status: hydrant.status as 'verified' | 'not_verified',
              hoseExpirationDate: hydrant.hose_expiration_date ? new Date(hydrant.hose_expiration_date) : undefined,
              hasRegister: hydrant.has_register || false,
              hasHose: hydrant.has_hose || false,
              hasKey: hydrant.has_key || false,
              hasCoupling: hydrant.has_coupling || false,
              hasAdapter: hydrant.has_adapter || false,
              hasNozzle: hydrant.has_nozzle || false,
            })),
          coordinates: nucleus.coordinates_lat && nucleus.coordinates_lng 
            ? { lat: Number(nucleus.coordinates_lat), lng: Number(nucleus.coordinates_lng) }
            : undefined,
          contact: {
            phone: nucleus.contact_phone || undefined,
            email: nucleus.contact_email || undefined,
          },
          fireExtinguishers: extinguishersData
            .filter(ext => ext.nucleus_id === nucleus.id)
            .map(ext => ({
              id: ext.id,
              type: ext.type as FireExtinguisher['type'],
              expirationDate: new Date(ext.expiration_date),
              location: ext.location,
              serialNumber: ext.serial_number || undefined,
              capacity: ext.capacity || undefined,
              lastInspection: ext.last_inspection ? new Date(ext.last_inspection) : undefined,
              hydrostaticTest: ext.hydrostatic_test ? new Date(ext.hydrostatic_test) : undefined,
              supportType: ext.support_type as FireExtinguisher['supportType'] || undefined,
              hasVerticalSignage: ext.has_vertical_signage || false,
              status: ext.status as FireExtinguisher['status'],
            })),
          documents: documentsData
            .filter(doc => doc.nucleus_id === nucleus.id)
            .map(doc => ({
              id: doc.id,
              type: doc.type as Document['type'],
              name: doc.name,
              url: doc.url,
              uploadedAt: new Date(doc.uploaded_at),
              size: doc.size || undefined,
              mimeType: doc.mime_type || undefined,
            })),
          fireDepartmentLicense: nucleus.fire_department_license_valid_until
            ? {
                validUntil: new Date(nucleus.fire_department_license_valid_until),
                documentUrl: nucleus.fire_department_license_document_url || undefined,
              }
            : undefined,
          createdAt: new Date(nucleus.created_at),
          updatedAt: new Date(nucleus.updated_at),
        };
        
        return combinedNucleus;
      });

      setNuclei(combinedNuclei);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar dados');
      console.error('Error fetching nuclei:', err);
    } finally {
      setLoading(false);
    }
  };

  // Add new nucleus
  const addNucleus = async (nucleus: Omit<Nucleus, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (!user) {
      setError('Usuário não autenticado');
      return;
    }
    try {
      // Insert nucleus
      const { data: nucleusData, error: nucleusError } = await supabase
        .from('nuclei')
        .insert({
          name: nucleus.name,
          city: nucleus.city,
          address: nucleus.address,
          is_agent_mode: nucleus.isAgentMode || false,
        // Hydrants will be handled separately
          coordinates_lat: nucleus.coordinates?.lat,
          coordinates_lng: nucleus.coordinates?.lng,
          contact_phone: nucleus.contact?.phone,
          contact_email: nucleus.contact?.email,
          fire_department_license_valid_until: nucleus.fireDepartmentLicense?.validUntil?.toISOString().split('T')[0],
          fire_department_license_document_url: nucleus.fireDepartmentLicense?.documentUrl,
          user_id: user.id,
        })
        .select()
        .single();

      if (nucleusError) throw nucleusError;

      // Insert fire extinguishers
      if (nucleus.fireExtinguishers.length > 0) {
        const { error: extError } = await supabase
          .from('fire_extinguishers')
          .insert(
            nucleus.fireExtinguishers.map(ext => ({
              nucleus_id: nucleusData.id,
              type: ext.type,
              expiration_date: ext.expirationDate.toISOString().split('T')[0],
              location: ext.location,
              capacity: ext.capacity,
              hydrostatic_test: ext.hydrostaticTest?.toISOString().split('T')[0],
              support_type: ext.supportType,
              has_vertical_signage: ext.hasVerticalSignage,
              status: ext.status,
            }))
          );

        if (extError) throw extError;
      }

      // Insert hydrants
      if (nucleus.hydrants.length > 0) {
        const { error: hydError } = await supabase
          .from('hydrants')
          .insert(
            nucleus.hydrants.map(hydrant => ({
              nucleus_id: nucleusData.id,
              location: hydrant.location,
              status: hydrant.status,
              hose_expiration_date: hydrant.hoseExpirationDate?.toISOString().split('T')[0],
              has_register: hydrant.hasRegister,
              has_hose: hydrant.hasHose,
              has_key: hydrant.hasKey,
              has_coupling: hydrant.hasCoupling,
              has_adapter: hydrant.hasAdapter,
              has_nozzle: hydrant.hasNozzle,
            }))
          );

        if (hydError) throw hydError;
      }

      // Insert documents
      if (nucleus.documents.length > 0) {
        const { error: docError } = await supabase
          .from('documents')
          .insert(
            nucleus.documents.map(doc => ({
              nucleus_id: nucleusData.id,
              type: doc.type,
              name: doc.name,
              url: doc.url,
              size: doc.size,
              mime_type: doc.mimeType,
            }))
          );

        if (docError) throw docError;
      }

      await fetchNuclei();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao adicionar núcleo');
      console.error('Error adding nucleus:', err);
    }
  };

  // Update nucleus
  const updateNucleus = async (nucleus: Nucleus) => {
    try {
      console.log('Updating nucleus:', nucleus.id);
      
      // Update nucleus basic info
      const { error: nucleusError } = await supabase
        .from('nuclei')
        .update({
          name: nucleus.name,
          city: nucleus.city,
          address: nucleus.address,
          is_agent_mode: nucleus.isAgentMode || false,
          coordinates_lat: nucleus.coordinates?.lat,
          coordinates_lng: nucleus.coordinates?.lng,
          contact_phone: nucleus.contact?.phone,
          contact_email: nucleus.contact?.email,
          fire_department_license_valid_until: nucleus.fireDepartmentLicense?.validUntil?.toISOString().split('T')[0],
          fire_department_license_document_url: nucleus.fireDepartmentLicense?.documentUrl,
        })
        .eq('id', nucleus.id);

      if (nucleusError) throw nucleusError;

      // Delete existing fire extinguishers and insert new ones
      const { error: deleteExtError } = await supabase
        .from('fire_extinguishers')
        .delete()
        .eq('nucleus_id', nucleus.id);

      if (deleteExtError) throw deleteExtError;

      if (nucleus.fireExtinguishers.length > 0) {
        const extinguishersData = nucleus.fireExtinguishers.map(ext => ({
          nucleus_id: nucleus.id,
          type: ext.type,
          expiration_date: ext.expirationDate.toISOString().split('T')[0],
          location: ext.location,
          capacity: ext.capacity,
          hydrostatic_test: ext.hydrostaticTest?.toISOString().split('T')[0],
          support_type: ext.supportType,
          has_vertical_signage: ext.hasVerticalSignage,
          status: ext.status,
        }));
        
        console.log('Extinguishers data being saved:', extinguishersData);
        
        const { error: extError } = await supabase
          .from('fire_extinguishers')
          .insert(extinguishersData);

        if (extError) throw extError;
      }

      // Delete existing hydrants and insert new ones
      const { error: deleteHydError } = await supabase
        .from('hydrants')
        .delete()
        .eq('nucleus_id', nucleus.id);

      if (deleteHydError) throw deleteHydError;

      if (nucleus.hydrants.length > 0) {
        const { error: hydError } = await supabase
          .from('hydrants')
          .insert(
            nucleus.hydrants.map(hydrant => ({
              nucleus_id: nucleus.id,
              location: hydrant.location,
              status: hydrant.status,
              hose_expiration_date: hydrant.hoseExpirationDate?.toISOString().split('T')[0],
              has_register: hydrant.hasRegister,
              has_hose: hydrant.hasHose,
              has_key: hydrant.hasKey,
              has_coupling: hydrant.hasCoupling,
              has_adapter: hydrant.hasAdapter,
              has_nozzle: hydrant.hasNozzle,
            }))
          );

        if (hydError) throw hydError;
      }

      // Delete existing documents and insert new ones
      const { error: deleteDocError } = await supabase
        .from('documents')
        .delete()
        .eq('nucleus_id', nucleus.id);

      if (deleteDocError) throw deleteDocError;

      if (nucleus.documents.length > 0) {
        const { error: docError } = await supabase
          .from('documents')
          .insert(
            nucleus.documents.map(doc => ({
              nucleus_id: nucleus.id,
              type: doc.type,
              name: doc.name,
              url: doc.url,
              size: doc.size,
              mime_type: doc.mimeType,
            }))
          );

        if (docError) throw docError;
      }

      console.log('Nucleus updated successfully, refetching data...');
      await fetchNuclei();
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao atualizar núcleo');
      console.error('Error updating nucleus:', err);
      throw err;
    }
  };

  // Delete nucleus
  const deleteNucleus = async (nucleusId: string) => {
    try {
      // Delete related data first (due to foreign key constraints)
      await Promise.all([
        supabase.from('fire_extinguishers').delete().eq('nucleus_id', nucleusId),
        supabase.from('hydrants').delete().eq('nucleus_id', nucleusId),
        supabase.from('documents').delete().eq('nucleus_id', nucleusId),
      ]);

      // Delete the nucleus itself
      const { error: nucleusError } = await supabase
        .from('nuclei')
        .delete()
        .eq('id', nucleusId);

      if (nucleusError) throw nucleusError;

      await fetchNuclei();
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao deletar núcleo');
      console.error('Error deleting nucleus:', err);
      throw err;
    }
  };

  // Get nucleus by ID
  const getNucleusById = (id: string) => {
    return nuclei.find(nucleus => nucleus.id === id);
  };

  useEffect(() => {
    fetchNuclei();
  }, []);

  return {
    nuclei,
    loading,
    error,
    addNucleus,
    updateNucleus,
    deleteNucleus,
    getNucleusById,
    refetch: fetchNuclei,
  };
}