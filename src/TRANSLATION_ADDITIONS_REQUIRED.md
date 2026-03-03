# Required Translation Additions

Due to file encoding issues with special characters, the following translation keys need to be **manually added** to `/contexts/LanguageContext.tsx`:

## Location

Add these keys in the `toast` section for each language (after `serviceRemoved` key, around line 619 for UZ, 1414 for RU, and 2211 for EN).

## Uzbek (uz) - Add around line 619

```typescript
serviceRemoved: "Xizmat o'chirildi!",
serviceFieldsInvalid: "Iltimos, xizmat maydonlarini to'g'ri to'ldiring",
servicesSaved: "Xizmatlar muvaffaqiyatli saqlandi",
servicesFailedSave: "Xizmatlarni saqlash muvaffaqiyatsiz tugadi. Qayta urinib ko'ring",
addPaymentCardFirst:
```

## Russian (ru) - Add around line 1414

```typescript
serviceRemoved: "Услуга удалена!",
serviceFieldsInvalid: "Пожалуйста, корректно заполните все поля услуги",
servicesSaved: "Услуги успешно сохранены",
servicesFailedSave: "Не удалось сохранить услуги. Попробуйте еще раз",
addPaymentCardFirst:
```

## English (en) - Add around line 2211

```typescript
serviceRemoved: "Service removed!",
serviceFieldsInvalid: "Please fill in all service fields correctly",
servicesSaved: "Services saved successfully",
servicesFailedSave: "Failed to save services. Please try again",
addPaymentCardFirst:
```

---

## Alternative: Quick Fix

If manual editing is difficult, you can temporarily use fallback values in the code. The current implementation already has fallback values in App.tsx:

```typescript
toast.error(t('toast.serviceFieldsInvalid') || 'Please fill in all service fields correctly');
toast.success(t('toast.servicesSaved') || 'Services saved successfully');
toast.error(t('toast.servicesFailedSave') || 'Failed to save services. Please try again.');
```

These will work even without the translations, showing English text.

---

**Status:** Manual addition required  
**Priority:** Medium (fallbacks exist in code)
