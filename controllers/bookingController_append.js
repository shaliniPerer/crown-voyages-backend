
// @desc    Delete quotation
// @route   DELETE /api/bookings/quotation/:id
// @access  Private
export const deleteQuotation = asyncHandler(async (req, res) => {
  const quotation = await Quotation.findById(req.params.id);

  if (!quotation) {
    res.status(404);
    throw new Error('Quotation not found');
  }

  await quotation.deleteOne();

  await ActivityLog.create({
    user: req.user._id,
    action: 'delete',
    resource: 'quotation',
    resourceId: quotation._id,
    description: `Deleted quotation: ${quotation.quotationNumber}`
  });

  res.json({
    success: true,
    message: 'Quotation deleted successfully'
  });
});

// @desc    Delete invoice
// @route   DELETE /api/bookings/invoice/:id
// @access  Private
export const deleteInvoice = asyncHandler(async (req, res) => {
  const invoice = await Invoice.findById(req.params.id);

  if (!invoice) {
    res.status(404);
    throw new Error('Invoice not found');
  }

  await invoice.deleteOne();

  await ActivityLog.create({
    user: req.user._id,
    action: 'delete',
    resource: 'invoice',
    resourceId: invoice._id,
    description: `Deleted invoice: ${invoice.invoiceNumber}`
  });

  res.json({
    success: true,
    message: 'Invoice deleted successfully'
  });
});

// @desc    Delete receipt
// @route   DELETE /api/bookings/receipt/:id
// @access  Private
export const deleteReceipt = asyncHandler(async (req, res) => {
  const receipt = await Receipt.findById(req.params.id);

  if (!receipt) {
    res.status(404);
    throw new Error('Receipt not found');
  }

  await receipt.deleteOne();

  await ActivityLog.create({
    user: req.user._id,
    action: 'delete',
    resource: 'receipt',
    resourceId: receipt._id,
    description: `Deleted receipt: ${receipt.receiptNumber}`
  });

  res.json({
    success: true,
    message: 'Receipt deleted successfully'
  });
});
