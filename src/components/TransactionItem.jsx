import { ArrowDownLeft, ArrowUpRight, HandCoins } from "lucide-react";
import { formatCurrency } from "../utils/currency";
import { formatDate } from "../utils/finance";

function TransactionItem({ transaction, categoryName = "Outros", convertedAmount }) {
  const isIncome = transaction.type === "income";
  const Icon = isIncome ? ArrowUpRight : ArrowDownLeft;
  const displayAmount = convertedAmount === undefined ? transaction.convertedAmount : convertedAmount;
  const signedValue = `${isIncome ? "+" : "-"}${formatCurrency(displayAmount, transaction.toCurrency)}`;

  return (
    <article className="transaction-item">
      <div className={`transaction-icon ${isIncome ? "income" : "expense"}`}>
        <Icon size={18} />
      </div>

      <div className="transaction-copy">
        <strong>{transaction.description}</strong>
        <span>
          {categoryName} • {formatDate(transaction.date)}
        </span>
        {transaction.shared ? (
          <small>
            <HandCoins size={14} />A receber: {formatCurrency(transaction.sharedAmountToReceive, transaction.toCurrency)}
          </small>
        ) : null}
      </div>

      <div className={`transaction-value ${isIncome ? "income" : "expense"}`}>{signedValue}</div>
    </article>
  );
}

export default TransactionItem;
