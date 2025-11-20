# 🚀 Instrucciones de Despliegue - Corrección de Archivado

## Opción 1: Usando el Script Automático (Recomendado)

1. **Conectar al VPS:**
   ```bash
   ssh root@145.223.26.119
   ```

2. **Copiar el script al VPS:**
   ```bash
   # Desde tu máquina local
   scp deploy-fix-archivado.sh root@145.223.26.119:/opt/portal-online/
   ```

3. **Ejecutar el script en el VPS:**
   ```bash
   cd /opt/portal-online
   chmod +x deploy-fix-archivado.sh
   bash deploy-fix-archivado.sh
   ```

---

## Opción 2: Comandos Manuales

Si prefieres ejecutar paso a paso:

### 1. Conectar al VPS
```bash
ssh root@145.223.26.119
```

### 2. Ir al directorio del proyecto
```bash
cd /opt/portal-online
```

### 3. Descargar cambios
```bash
git pull origin master
```

### 4. Rebuild del backend (sin caché)
```bash
docker-compose build --no-cache backend
```

### 5. Reiniciar backend
```bash
docker-compose up -d backend
```

### 6. Verificar logs
```bash
docker-compose logs -f backend
# Presiona Ctrl+C para salir
```

### 7. Verificar estado
```bash
docker-compose ps
```

---

## 🧪 Verificación Post-Despliegue

### 1. Verificar Morosidad en Dashboard Admin

1. Ir a: `http://145.223.26.119`
2. Login como `super_admin`
3. Dashboard debe mostrar:
   - **Morosidad: 38.89%** (o similar)
   - **Boletas vencidas: 7** (aproximadamente)

### 2. Probar Restricción de Archivado

**Intentar archivar boleta VENCIDA (debe fallar):**
1. Ir a **Boletas** en el admin
2. Buscar una boleta con estado `vencida`
3. Intentar archivarla
4. **Resultado esperado:** Error "Solo se pueden archivar boletas pagadas"

**Archivar boleta PAGADA (debe funcionar):**
1. Buscar una boleta con estado `pagada`
2. Archivarla
3. **Resultado esperado:** Éxito, boleta archivada

### 3. Verificar API Directamente

```bash
# Desde el VPS, probar el endpoint de dashboard stats
curl -X GET http://localhost:3001/api/admin/dashboard/stats \
  -H "Authorization: Bearer TU_TOKEN_AQUI"

# Debería retornar morosidad > 0
```

---

## 🔧 Troubleshooting

### Problema: "git pull" da error de conflictos
```bash
# Guardar cambios locales si hay
git stash

# Pull
git pull origin master

# Aplicar cambios guardados (si los había)
git stash pop
```

### Problema: Backend no inicia
```bash
# Ver logs completos
docker-compose logs backend

# Revisar últimas 50 líneas
docker-compose logs --tail=50 backend

# Seguir logs en tiempo real
docker-compose logs -f backend
```

### Problema: Puerto ocupado
```bash
# Ver qué proceso usa el puerto 3001
netstat -tlnp | grep 3001

# Matar proceso si es necesario
kill -9 PROCESS_ID
```

### Problema: Docker sin espacio
```bash
# Limpiar imágenes viejas
docker system prune -a

# Limpiar todo (cuidado, borra volúmenes)
docker system prune -a --volumes
```

---

## 📋 Checklist de Despliegue

- [ ] Conectado al VPS
- [ ] `git pull origin master` ejecutado
- [ ] Backend reconstruido (`docker-compose build --no-cache backend`)
- [ ] Backend reiniciado (`docker-compose up -d backend`)
- [ ] Logs revisados (sin errores)
- [ ] Dashboard muestra morosidad correcta (>0%)
- [ ] Intentar archivar vencida = ERROR ✅
- [ ] Archivar pagada = ÉXITO ✅

---

## 🎯 Cambios Desplegados

1. **Validación de archivado:** Solo boletas pagadas pueden archivarse
2. **Corrección de morosidad:** 7 boletas vencidas detectadas
3. **Campo `pagada`:** Actualizado en boletas pagadas
4. **Documentación:** `FLUJO_MOROSIDAD.md` y `RESUMEN_CORRECCION_ARCHIVADO.md`

---

## 📞 Si Algo Sale Mal

### Rollback (volver atrás):
```bash
# Ver commits recientes
git log --oneline -5

# Volver al commit anterior
git reset --hard 336518c  # Reemplazar con hash del commit anterior

# Rebuild y restart
docker-compose build --no-cache backend
docker-compose up -d backend
```

### Contacto:
- Revisar logs: `docker-compose logs backend`
- Revisar estado: `docker-compose ps`
- Verificar base de datos: scripts en `server/*.js`

---

## ✅ Éxito

Si ves esto en los logs:
```
✅ Dashboard stats calculated
⚠️ Morosidad: XX.XX%
🔔 Overdue boletas notification service started
```

**¡Despliegue exitoso!** 🎉
