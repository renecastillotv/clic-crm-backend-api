/**
 * CrmMensajeria - Redirect to Chats sub-page
 *
 * This file previously contained the full messaging UI as a monolith (3 tabs).
 * Now the tabs are separate pages: CrmMensajeriaChats, CrmMensajeriaCorreo, CrmMensajeriaConfiguracion.
 * This redirect exists only for backward compatibility.
 */

import { Navigate, useParams } from 'react-router-dom';

export default function CrmMensajeria() {
  const { tenantSlug } = useParams();
  return <Navigate to={`/crm/${tenantSlug}/mensajeria/chats`} replace />;
}
