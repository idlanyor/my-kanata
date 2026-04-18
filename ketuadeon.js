         
/*=========================================================================================*/
   
            /* =========================
   ORDER3 MANUAL SYSTEM
   Files:
   - ./manual/prices.json
   - ./manual/orders.json
========================= */

function order3ManualDir() {
  return './manual';
}

function order3PriceFile() {
  return './manual/prices.json';
}

function order3OrderFile() {
  return './manual/orders.json';
}

function ensureOrder3Storage() {
  const manualDir = order3ManualDir();
  const orderFile = order3OrderFile();

  if (!fs.existsSync(manualDir)) {
    fs.mkdirSync(manualDir, { recursive: true });
  }

  if (!fs.existsSync(orderFile)) {
    fs.writeFileSync(orderFile, '[]');
  }
}

function getAdminJid() {
  return '601135045162@s.whatsapp.net';
}

function getMarkupByRole(userRole) {
  let markupPercentage = defaultMarkupPercentage;

  if (userRole === "GOLD") markupPercentage = marginGold;
  else if (userRole === "SILVER") markupPercentage = marginSilver;
  else if (userRole === "BRONZE") markupPercentage = marginBronze;
  else if (userRole === "OWNER") markupPercentage = marginOwner;

  return markupPercentage;
}

function loadOrder3Prices() {
  ensureOrder3Storage();
  const file = order3PriceFile();

  if (!fs.existsSync(file)) return {};

  try {
    const raw = fs.readFileSync(file, 'utf8');
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch (e) {
    console.error('ORDER3 price file read error:', e);
    return {};
  }
}

function loadOrder3Orders() {
  ensureOrder3Storage();
  const file = order3OrderFile();

  if (!fs.existsSync(file)) return [];

  try {
    const raw = fs.readFileSync(file, 'utf8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    console.error('ORDER3 order file read error:', e);
    return [];
  }
}

function saveOrder3Orders(data) {
  ensureOrder3Storage();
  fs.writeFileSync(order3OrderFile(), JSON.stringify(data, null, 2));
}

function formatCompactMyr(num) {
  return formatmoneyMY(Math.round(Number(num) * 100) / 100);
}

function generateOrder3Invoice() {
  const now = new Date();
  return (
    `INV-${now.getFullYear().toString().slice(-2)}` +
    `${String(now.getMonth() + 1).padStart(2, '0')}` +
    `${String(now.getDate()).padStart(2, '0')}-` +
    `${String(now.getHours()).padStart(2, '0')}` +
    `${String(now.getMinutes()).padStart(2, '0')}-` +
    `${Math.floor(1000 + Math.random() * 9000)}`
  );
}

function getButtonId(m) {
  return (
    m.message?.buttonsResponseMessage?.selectedButtonId ||
    m.message?.templateButtonReplyMessage?.selectedId ||
    m.message?.listResponseMessage?.singleSelectReply?.selectedRowId ||
    ''
  );
}

function getMessageText(m) {
  return (m.text || '').trim();
}

function getOrder3Input(m) {
  const buttonId = getButtonId(m);
  const textValue = getMessageText(m);
  return {
    buttonId,
    textValue,
    combined: buttonId || textValue || ''
  };
}

function findOrderIndexByInvoice(orders, invoice) {
  return orders.findIndex(v => v.invoicePreview === invoice);
}

function findLatestUserWaitingConfirmOrder(orders, nomor) {
  for (let i = orders.length - 1; i >= 0; i--) {
    if (orders[i].nomor === nomor && orders[i].status === 'WAITING_CONFIRM') {
      return i;
    }
  }
  return -1;
}

function getFailReasonText(code) {
  if (code === 'invalidid') return 'Invalid ID / Server.';
  if (code === 'wrongdetails') return 'Wrong account details were submitted.';
  if (code === 'unavailable') return 'The product is currently unavailable.';
  if (code === 'providererror') return 'A provider or processing error occurred.';
  return 'Order could not be completed.';
}

function parseAdminSuccessInvoice(buttonId, textValue) {
  if (buttonId && buttonId.startsWith('order3_success_')) {
    return buttonId.replace('order3_success_', '').trim();
  }

  if (textValue.startsWith('Success ')) {
    return textValue.replace('Success ', '').trim();
  }

  if (textValue.startsWith('✅ Success ')) {
    return textValue.replace('✅ Success ', '').trim();
  }

  return '';
}

function parseAdminFailedInvoice(buttonId, textValue) {
  if (buttonId && buttonId.startsWith('order3_failed_')) {
    return buttonId.replace('order3_failed_', '').trim();
  }

  if (textValue.startsWith('Failed ')) {
    return textValue.replace('Failed ', '').trim();
  }

  if (textValue.startsWith('❌ Failed ')) {
    return textValue.replace('❌ Failed ', '').trim();
  }

  return '';
}

function parseFailReason(buttonId, textValue) {
  if (buttonId && buttonId.startsWith('order3_failreason_')) {
    const raw = buttonId.replace('order3_failreason_', '');
    const lastUnderscore = raw.lastIndexOf('_');
    if (lastUnderscore === -1) return { reasonCode: '', invoice: '' };

    return {
      reasonCode: raw.substring(0, lastUnderscore),
      invoice: raw.substring(lastUnderscore + 1)
    };
  }

  if (textValue.startsWith('Reason ')) {
    // format: Reason invalidid INV-...
    const parts = textValue.split(' ');
    if (parts.length >= 3) {
      return {
        reasonCode: parts[1].trim(),
        invoice: parts.slice(2).join(' ').trim()
      };
    }
  }

  return { reasonCode: '', invoice: '' };
}

function sendOrder3ToAdminText(orderData, nomor) {
  return `📥 *NEW ORDER3 RECEIVED*

👤 *Name:* ${orderData.pushname || '-'}
📱 *Number:* ${nomor}
🧾 *Invoice:* ${orderData.invoicePreview}
📦 *Code:* ${orderData.productCode}

💰 *Base Price (MYR):* ${formatCompactMyr(orderData.basePriceMyr)}
📈 *Markup:* ${orderData.markupPercentage}%
💳 *Final Selling Price:* ${formatCompactMyr(orderData.finalPriceMyr)}

🎯 *User ID:* ${orderData.uid}
🖥 *Server:* ${orderData.sid}`;
}

/* =========================
   BUTTON / TEXT HANDLER
   PUT THIS BEFORE switch(command)
========================= */

const order3Input = getOrder3Input(m);
const order3ButtonId = order3Input.buttonId;
const order3TextValue = order3Input.textValue;
const order3Combined = order3Input.combined;

/* ---------- USER PROCEED ---------- */
if (
  order3ButtonId === 'order3_yes' ||
  order3TextValue === '✅ Proceed' ||
  command === 'order3_yes'
) {
  ensureOrder3Storage();

  const nomor = sender.split("@")[0];
  const orders = loadOrder3Orders();

  const index = findLatestUserWaitingConfirmOrder(orders, nomor);
  if (index === -1) {
    return m.reply(`There is no pending Order3 confirmation to proceed.`);
  }

  const orderData = orders[index];
  const userDoc = await db.collection("users").doc(nomor).get();
  const userProfile = userDoc.data();

  if (!userProfile) {
    return m.reply(`User was not found.`);
  }

  if (userProfile.saldo < orderData.finalPriceMyr) {
    orders[index].status = 'CANCELLED';
    orders[index].cancelledAt = Date.now();
    saveOrder3Orders(orders);

    return m.reply(
`❌ *Insufficient Balance*

📦 *Product:* ${orderData.productCode}
💳 *Price:* ${formatCompactMyr(orderData.finalPriceMyr)}
💼 *Your Balance:* ${formatCompactMyr(userProfile.saldo)}`
    );
  }

  userProfile.saldo -= orderData.finalPriceMyr;
  await db.collection("users").doc(nomor).set(Object.assign({}, userProfile));

  orders[index].status = 'PENDING';
  orders[index].paidAt = Date.now();
  saveOrder3Orders(orders);

  await m.reply(
`✅ *ORDER SUBMITTED*

🧾 *Invoice:* ${orderData.invoicePreview}
📦 *Product:* ${orderData.productCode}
🎯 *User ID:* ${orderData.uid}
🖥 *Server:* ${orderData.sid}
💳 *Paid:* ${formatCompactMyr(orderData.finalPriceMyr)}
💼 *Remaining Balance:* ${formatCompactMyr(userProfile.saldo)}

Your order has been sent to the admin for manual processing.
You will receive a notification once it is completed.`
  );

  const adminJid = getAdminJid();
  console.log('ORDER3 ADMIN JID:', adminJid);

  try {
    await client.sendMessage(adminJid, {
      text: sendOrder3ToAdminText(orderData, nomor),
      footer: 'NalliShop Admin Panel',
      buttons: [
        {
          buttonId: `order3_success_${orderData.invoicePreview}`,
          buttonText: { displayText: `Success ${orderData.invoicePreview}` },
          type: 1
        },
        {
          buttonId: `order3_failed_${orderData.invoicePreview}`,
          buttonText: { displayText: `Failed ${orderData.invoicePreview}` },
          type: 1
        }
      ],
      headerType: 1
    }, { quoted: m });

    return;
  } catch (err) {
    console.error('ORDER3 SEND ADMIN ERROR:', err);
    return m.reply(`Order was submitted, but failed to send notification to admin.`);
  }
}

/* ---------- USER CANCEL ---------- */
if (
  order3ButtonId === 'order3_no' ||
  order3TextValue === '❌ Cancel' ||
  command === 'order3_no'
) {
  ensureOrder3Storage();

  const nomor = sender.split("@")[0];
  const orders = loadOrder3Orders();

  const index = findLatestUserWaitingConfirmOrder(orders, nomor);
  if (index === -1) {
    return m.reply(`There is no pending Order3 confirmation to cancel.`);
  }

  orders[index].status = 'CANCELLED';
  orders[index].cancelledAt = Date.now();
  saveOrder3Orders(orders);

  return m.reply(`Your Order3 has been cancelled.`);
}

/* ---------- ADMIN SUCCESS ---------- */
const parsedSuccessInvoice = parseAdminSuccessInvoice(order3ButtonId, order3TextValue);
if (parsedSuccessInvoice) {
  ensureOrder3Storage();

  if (!isOwner) return m.reply('Admin only.');

  const orders = loadOrder3Orders();
  const index = findOrderIndexByInvoice(orders, parsedSuccessInvoice);

  if (index === -1 || orders[index].status !== 'PENDING') {
    return m.reply(`Pending order with invoice *${parsedSuccessInvoice}* was not found.`);
  }

  const orderData = orders[index];
  orders[index].status = 'SUCCESS';
  orders[index].successAt = Date.now();
  saveOrder3Orders(orders);

  await client.sendMessage(`${orderData.nomor}@s.whatsapp.net`, {
    text:
`✅ *ORDER COMPLETED*

🧾 *Invoice:* ${orderData.invoicePreview}
📦 *Product:* ${orderData.productCode}
🎯 *User ID:* ${orderData.uid}
🖥 *Server:* ${orderData.sid}
💳 *Paid:* ${formatCompactMyr(orderData.finalPriceMyr)}

Your order has been completed successfully.
Thank you for your purchase.`
  }, { quoted: m });

  return m.reply(
`✅ *ORDER3 SUCCESS*

👤 *User:* ${orderData.pushname || '-'}
📱 *Number:* ${orderData.nomor}
🧾 *Invoice:* ${orderData.invoicePreview}
📦 *Code:* ${orderData.productCode}

💰 *Base Price (MYR):* ${formatCompactMyr(orderData.basePriceMyr)}
📈 *Markup:* ${orderData.markupPercentage}%
💳 *Final Selling Price:* ${formatCompactMyr(orderData.finalPriceMyr)}

🎯 *User ID:* ${orderData.uid}
🖥 *Server:* ${orderData.sid}`
  );
}

/* ---------- ADMIN FAILED ---------- */
const parsedFailedInvoice = parseAdminFailedInvoice(order3ButtonId, order3TextValue);
if (parsedFailedInvoice) {
  ensureOrder3Storage();

  if (!isOwner) return m.reply('Admin only.');

  const orders = loadOrder3Orders();
  const index = findOrderIndexByInvoice(orders, parsedFailedInvoice);

  if (index === -1 || orders[index].status !== 'PENDING') {
    return m.reply(`Pending order with invoice *${parsedFailedInvoice}* was not found.`);
  }

  orders[index].status = 'WAITING_FAIL_REASON';
  saveOrder3Orders(orders);

  return await client.sendMessage(m.chat, {
    text:
`❌ *SELECT FAILURE REASON*

🧾 *Invoice:* ${parsedFailedInvoice}

Please choose the reason for this failed order:`,
    footer: 'NalliShop Admin Panel',
    buttons: [
      {
        buttonId: `order3_failreason_invalidid_${parsedFailedInvoice}`,
        buttonText: { displayText: `Reason invalidid ${parsedFailedInvoice}` },
        type: 1
      },
      {
        buttonId: `order3_failreason_wrongdetails_${parsedFailedInvoice}`,
        buttonText: { displayText: `Reason wrongdetails ${parsedFailedInvoice}` },
        type: 1
      },
      {
        buttonId: `order3_failreason_unavailable_${parsedFailedInvoice}`,
        buttonText: { displayText: `Reason unavailable ${parsedFailedInvoice}` },
        type: 1
      },
      {
        buttonId: `order3_failreason_providererror_${parsedFailedInvoice}`,
        buttonText: { displayText: `Reason providererror ${parsedFailedInvoice}` },
        type: 1
      }
    ],
    headerType: 1
  }, { quoted: m });
}

/* ---------- ADMIN FAIL REASON ---------- */
const parsedFailReason = parseFailReason(order3ButtonId, order3TextValue);
if (parsedFailReason.reasonCode && parsedFailReason.invoice) {
  ensureOrder3Storage();

  if (!isOwner) return m.reply('Admin only.');

  const orders = loadOrder3Orders();
  const index = findOrderIndexByInvoice(orders, parsedFailReason.invoice);

  if (index === -1 || orders[index].status !== 'WAITING_FAIL_REASON') {
    return m.reply(`Failed order reason session for invoice *${parsedFailReason.invoice}* was not found.`);
  }

  const orderData = orders[index];
  const userRef = db.collection("users").doc(orderData.nomor);
  const userDoc = await userRef.get();
  const userProfile = userDoc.data();

  if (!userProfile) {
    return m.reply(`User ${orderData.nomor} was not found.`);
  }

  const failReason = getFailReasonText(parsedFailReason.reasonCode);

  userProfile.saldo += orderData.finalPriceMyr;
  await userRef.set(Object.assign({}, userProfile));

  orders[index].status = 'FAILED';
  orders[index].failedAt = Date.now();
  orders[index].failReason = failReason;
  orders[index].failReasonCode = parsedFailReason.reasonCode;
  saveOrder3Orders(orders);

  await client.sendMessage(`${orderData.nomor}@s.whatsapp.net`, {
    text:
`❌ *ORDER FAILED*

🧾 *Invoice:* ${orderData.invoicePreview}
📦 *Product:* ${orderData.productCode}
💸 *Refunded:* ${formatCompactMyr(orderData.finalPriceMyr)}
💳 *Current Balance:* ${formatCompactMyr(userProfile.saldo)}

*Reason:*
${failReason}

Please check your details and contact admin if needed.`
  }, { quoted: m });

  return m.reply(
`❌ *ORDER3 FAILED*

👤 *User:* ${orderData.pushname || '-'}
📱 *Number:* ${orderData.nomor}
🧾 *Invoice:* ${orderData.invoicePreview}
📦 *Code:* ${orderData.productCode}
📝 *Reason:* ${failReason}

💰 *Base Price (MYR):* ${formatCompactMyr(orderData.basePriceMyr)}
📈 *Markup:* ${orderData.markupPercentage}%
💳 *Final Selling Price:* ${formatCompactMyr(orderData.finalPriceMyr)}

🎯 *User ID:* ${orderData.uid}
🖥 *Server:* ${orderData.sid}

Refund completed successfully.`
  );
}

/* =========================
   PUT THIS INSIDE switch(command)
========================= */

case 'order3': {
  ensureOrder3Storage();

  const nomor = sender.split("@")[0];
  const args = (m.text || '').trim().split(/\s+/);
  const priceList = loadOrder3Prices();

  const userDoc = await db.collection("users").doc(nomor).get();
  const userProfile = userDoc.data();

  if (!userProfile) {
    return m.reply(`You are not registered yet. Please type *Register* first.`);
  }

  if (!Object.keys(priceList).length) {
    return m.reply(`The manual price list is empty or could not be loaded.`);
  }

  const markupPercentage = getMarkupByRole(userProfile.role);

  if (args.length === 1) {
    const entries = Object.entries(priceList)
      .map(([code, myrPrice]) => {
        const basePriceMyr = Math.round(Number(myrPrice) * 100) / 100;
        const finalPriceMyr = Math.round((basePriceMyr * (1 + markupPercentage / 100)) * 100) / 100;

        return {
          code,
          finalPrice: finalPriceMyr
        };
      })
      .filter(v => !isNaN(v.finalPrice) && v.finalPrice > 0)
      .sort((a, b) => a.finalPrice - b.finalPrice);

    const previewList = entries
      .slice(0, 20)
      .map((item, i) => `${i + 1}. *${item.code}* — ${formatCompactMyr(item.finalPrice)}`)
      .join('\n');

    return m.reply(
`🛒 *ORDER3 PRICE LIST*
> This product will be processed manually by admin

_*Available Products:*_
${previewList}

${entries.length > 20 ? `\n...and ${entries.length - 20} more item(s).` : ''}

📌 *Order Format*
> order3 <code> <id> <server>

📌 *Example*
> order3 MLBB_MY_14 12345678 1234`
    );
  }

  const productCode = args[1] ? args[1].toUpperCase() : '';
  const uid = args[2] || '';
  const sid = args[3] || '';

  if (!productCode || !uid || !sid) {
    return m.reply(
`Invalid format.

📌 *Correct Format*
> order3 <code> <id> <server>

📌 *Example*
> order3 MLBB_MY_14 12345678 2211`
    );
  }

  if (priceList[productCode] === undefined) {
    const availableCodes = Object.keys(priceList).slice(0, 20).join(', ');
    return m.reply(
`The product code *${productCode}* was not found.

Available codes:
${availableCodes}${Object.keys(priceList).length > 20 ? ' ...' : ''}`
    );
  }

  const basePriceMyr = Math.round(parseFloat(priceList[productCode]) * 100) / 100;
  if (isNaN(basePriceMyr) || basePriceMyr <= 0) {
    return m.reply(`The price for *${productCode}* is invalid in the manual price file.`);
  }

  const finalPriceMyr = Math.round((basePriceMyr * (1 + markupPercentage / 100)) * 100) / 100;

  if (userProfile.saldo < finalPriceMyr) {
    return m.reply(
`❌ *Insufficient Balance*

📦 *Product:* ${productCode}
💳 *Price:* ${formatCompactMyr(finalPriceMyr)}
💼 *Your Balance:* ${formatCompactMyr(userProfile.saldo)}`
    );
  }

  const invoicePreview = generateOrder3Invoice();
  const orders = loadOrder3Orders();

  const orderData = {
    type: 'order3',
    status: 'WAITING_CONFIRM',
    nomor,
    pushname,
    invoicePreview,
    productCode,
    basePriceMyr,
    markupPercentage,
    finalPriceMyr,
    uid,
    sid,
    createdAt: Date.now()
  };

  orders.push(orderData);
  saveOrder3Orders(orders);

  return await client.sendMessage(m.chat, {
    text:
`🛍️ *ORDER CONFIRMATION*

🧾 *Invoice:* ${invoicePreview}
📦 *Product:* ${productCode}
🎯 *User ID:* ${uid}
🖥 *Server:* ${sid}
💳 *Amount:* ${formatCompactMyr(finalPriceMyr)}

Please review your order carefully before proceeding.`,
    footer: 'NalliShop',
    buttons: [
      {
        buttonId: 'order3_yes',
        buttonText: { displayText: '✅ Proceed' },
        type: 1
      },
      {
        buttonId: 'order3_no',
        buttonText: { displayText: '❌ Cancel' },
        type: 1
      }
    ],
    headerType: 1
  }, { quoted: m });
}
break
