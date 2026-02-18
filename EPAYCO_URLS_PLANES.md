# URLs de ePayco para cada Plan

## Base URL
```
https://likering.onrender.com
```

## URLs de Respuesta (Response URL)
Estas son las URLs donde ePayco redirige al usuario después del pago:

### Plan Azul
```
https://likering.onrender.com/billetera.html?epayco_response=success&plan=azul
```

### Plan Rojo
```
https://likering.onrender.com/billetera.html?epayco_response=success&plan=rojo
```

### Plan Naranja
```
https://likering.onrender.com/billetera.html?epayco_response=success&plan=naranja
```

### Plan Amarillo
```
https://likering.onrender.com/billetera.html?epayco_response=success&plan=amarillo
```

### Plan Rosado
```
https://likering.onrender.com/billetera.html?epayco_response=success&plan=rosado
```

### Plan Fucsia
```
https://likering.onrender.com/billetera.html?epayco_response=success&plan=fucsia
```

### Plan Verde
```
https://likering.onrender.com/billetera.html?epayco_response=success&plan=verde
```

### Plan Marrón
```
https://likering.onrender.com/billetera.html?epayco_response=success&plan=marron
```

### Plan Gris
```
https://likering.onrender.com/billetera.html?epayco_response=success&plan=gris
```

### Plan Morado
```
https://likering.onrender.com/billetera.html?epayco_response=success&plan=morado
```

---

## URLs de Confirmación (Confirmation URL)
Estas son las URLs donde ePayco envía el webhook/confirmación del pago:

### Plan Azul
```
https://likering.onrender.com/api/epayco/confirmation?plan=azul
```

### Plan Rojo
```
https://likering.onrender.com/api/epayco/confirmation?plan=rojo
```

### Plan Naranja
```
https://likering.onrender.com/api/epayco/confirmation?plan=naranja
```

### Plan Amarillo
```
https://likering.onrender.com/api/epayco/confirmation?plan=amarillo
```

### Plan Rosado
```
https://likering.onrender.com/api/epayco/confirmation?plan=rosado
```

### Plan Fucsia
```
https://likering.onrender.com/api/epayco/confirmation?plan=fucsia
```

### Plan Verde
```
https://likering.onrender.com/api/epayco/confirmation?plan=verde
```

### Plan Marrón
```
https://likering.onrender.com/api/epayco/confirmation?plan=marron
```

### Plan Gris
```
https://likering.onrender.com/api/epayco/confirmation?plan=gris
```

### Plan Morado
```
https://likering.onrender.com/api/epayco/confirmation?plan=morado
```

---

## Información de los Planes

| Plan | Precio | IVA (19%) | Total | Ganancia Máxima | Likes para Regalar |
|------|--------|-----------|-------|-----------------|-------------------|
| Azul | $5 USD | $0.95 | $5.95 USD | $500 USD | 1 |
| Rojo | $10 USD | $1.90 | $11.90 USD | $600 USD | 2 |
| Naranja | $30 USD | $5.70 | $35.70 USD | $800 USD | 6 |
| Amarillo | $90 USD | $17.10 | $107.10 USD | $1,500 USD | 18 |
| Rosado | $180 USD | $34.20 | $214.20 USD | $3,000 USD | 36 |
| Fucsia | $360 USD | $68.40 | $428.40 USD | $6,000 USD | 72 |
| Verde | $540 USD | $102.60 | $642.60 USD | $9,000 USD | 108 |
| Marrón | $720 USD | $136.80 | $856.80 USD | $12,000 USD | 144 |
| Gris | $900 USD | $171.00 | $1,071.00 USD | $15,000 USD | 180 |
| Morado | $1,200 USD | $228.00 | $1,428.00 USD | $17,000 USD | 240 |

---

## Notas Importantes

1. **Todas las URLs ya están configuradas automáticamente** en el código JavaScript de `billetera.html`
2. **El backend detecta automáticamente el plan** desde:
   - `x_extra2` (enviado por ePayco)
   - Query parameter `plan` en la URL de confirmación
   - Referencia de la transacción (`x_ref_payco`)
3. **No necesitas configurar estas URLs manualmente** en el dashboard de ePayco si usas el botón generado dinámicamente
4. **Si creas botones manualmente en ePayco**, usa las URLs de esta lista

---

## Configuración en Dashboard de ePayco

Si vas a crear botones de pago manualmente en el dashboard de ePayco, usa estas URLs según el plan que estés configurando.

**Ejemplo para Plan Azul:**
- URL de Respuesta: `https://likering.onrender.com/billetera.html?epayco_response=success&plan=azul`
- URL de Confirmación: `https://likering.onrender.com/api/epayco/confirmation?plan=azul`

