import { useState, useEffect } from "react";
import { supabase, Tables } from "../supabase-client";
import { Transaction } from "../types";

// Data access functions
export const fetchTransactionsByUserId = async (
  userId: string,
  role: "buyer" | "seller" | "both" = "both",
  pagination?: { page: number; pageSize: number }
): Promise<{ data: Transaction[]; count: number } | null> => {
  let query = supabase
    .from(Tables.TRANSACTIONS)
    .select("*", { count: "exact" });

  if (role === "buyer") {
    query = query.eq("buyer_id", userId);
  } else if (role === "seller") {
    query = query.eq("seller_id", userId);
  } else {
    // Both roles
    query = query.or(`buyer_id.eq.${userId},seller_id.eq.${userId}`);
  }

  // Apply pagination
  if (pagination) {
    const { page, pageSize } = pagination;
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    query = query.range(from, to);
  }

  // Order by newest first
  query = query.order("created_at", { ascending: false });

  const { data, error, count } = await query;

  if (error) {
    console.error("Error fetching transactions:", error);
    return null;
  }

  return { data, count: count || 0 };
};

export const fetchTransactionById = async (
  transactionId: string
): Promise<Transaction | null> => {
  const { data, error } = await supabase
    .from(Tables.TRANSACTIONS)
    .select("*")
    .eq("id", transactionId)
    .single();

  if (error) {
    console.error("Error fetching transaction:", error);
    return null;
  }

  return data;
};

export const fetchTransactionsByListingId = async (
  listingId: string
): Promise<Transaction[] | null> => {
  const { data, error } = await supabase
    .from(Tables.TRANSACTIONS)
    .select("*")
    .eq("listing_id", listingId);

  if (error) {
    console.error("Error fetching transactions by listing:", error);
    return null;
  }

  return data;
};

export const createTransaction = async (
  transaction: Omit<Transaction, "id" | "created_at">
): Promise<Transaction | null> => {
  const { data, error } = await supabase
    .from(Tables.TRANSACTIONS)
    .insert(transaction)
    .select()
    .single();

  if (error) {
    console.error("Error creating transaction:", error);
    return null;
  }

  return data;
};

// React hook
export const useTransactions = (
  userId: string | null,
  role: "buyer" | "seller" | "both" = "both",
  pagination?: { page: number; pageSize: number }
) => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let isMounted = true;

    const loadTransactions = async () => {
      if (!userId) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const result = await fetchTransactionsByUserId(
          userId,
          role,
          pagination
        );

        if (isMounted && result) {
          setTransactions(result.data);
          setTotalCount(result.count);
          setError(null);
        }
      } catch (err) {
        if (isMounted) {
          setError(
            err instanceof Error
              ? err
              : new Error("Unknown error fetching transactions")
          );
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadTransactions();

    return () => {
      isMounted = false;
    };
  }, [userId, role, pagination?.page, pagination?.pageSize]);

  const recordTransaction = async (
    transaction: Omit<Transaction, "id" | "created_at">
  ): Promise<Transaction | null> => {
    try {
      const newTransaction = await createTransaction(transaction);

      if (newTransaction) {
        setTransactions((prev) => [newTransaction, ...prev]);
        setTotalCount((prev) => prev + 1);
      }

      return newTransaction;
    } catch (err) {
      setError(
        err instanceof Error
          ? err
          : new Error("Unknown error recording transaction")
      );
      return null;
    }
  };

  return {
    transactions,
    totalCount,
    loading,
    error,
    recordTransaction,
  };
};

// Hook for single transaction
export const useTransaction = (transactionId: string | null) => {
  const [transaction, setTransaction] = useState<Transaction | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let isMounted = true;

    const loadTransaction = async () => {
      if (!transactionId) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const data = await fetchTransactionById(transactionId);

        if (isMounted) {
          setTransaction(data);
          setError(null);
        }
      } catch (err) {
        if (isMounted) {
          setError(
            err instanceof Error
              ? err
              : new Error("Unknown error fetching transaction")
          );
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadTransaction();

    return () => {
      isMounted = false;
    };
  }, [transactionId]);

  return { transaction, loading, error };
};

// Hook for transactions by listing
export const useListingTransactions = (listingId: string | null) => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let isMounted = true;

    const loadTransactions = async () => {
      if (!listingId) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const data = await fetchTransactionsByListingId(listingId);

        if (isMounted) {
          setTransactions(data || []);
          setError(null);
        }
      } catch (err) {
        if (isMounted) {
          setError(
            err instanceof Error
              ? err
              : new Error("Unknown error fetching listing transactions")
          );
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadTransactions();

    return () => {
      isMounted = false;
    };
  }, [listingId]);

  return { transactions, loading, error };
};
