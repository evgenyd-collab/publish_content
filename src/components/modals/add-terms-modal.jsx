import React, { useState, useEffect } from "react";
import ReactDOM from "react-dom";

import { Spinner } from "../atoms/spinner";
const API_ENDPOINT = import.meta.env.VITE_ENDPOINT;
const AUTH_KEY = import.meta.env.VITE_AUTH_KEY;

export default function AddTermsModal({ bonus, onClose }) {
  const initialNewBonusData = {
    bookmaker_id: bonus?.bookmaker_id,
    url: bonus?.url,
    terms: "",
  };

  const [sessionToken, setSessionToken] = useState("");
  const [newTermsFormData, setNewTermsFormData] = useState(initialNewBonusData);
  const [isLoading, setIsLoading] = useState(false);

  const handleAddTerms = async () => {
    try {
      const response = await fetch(`${API_ENDPOINT}/bonuses/`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${sessionToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(newTermsFormData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error("Error adding bonus", errorData.message);
        setIsLoading(false);
        return;
      }

      console.log("Terms added successfully!");
      setNewTermsFormData({
        ...newTermsFormData,
        terms: "",
      });
      setIsLoading(false);
      onClose();
    } catch (error) {
      console.error("Error adding terms bonuses:", error);
    }
  };

  useEffect(() => {
    async function fetchAuthToken() {
      const url = `${API_ENDPOINT}/auth`;
      const headers = new Headers({
        accept: "application/json",
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${AUTH_KEY}`,
      });

      const body = new URLSearchParams({
        username: "admin345543",
        password: "R6o5sVhzHPzBcZg",
      });

      try {
        const response = await fetch(url, {
          method: "POST",
          headers: headers,
          body: body,
        });

        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`);
        }

        const data = await response.json();
        return data;
      } catch (error) {
        console.error("Error fetching auth token:", error);
        return null;
      }
    }

    fetchAuthToken().then((tokenData) => {
      setSessionToken(tokenData.access_token);
    });
  }, []);

  return ReactDOM.createPortal(
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-2xl w-full p-6">
        <div className="flex justify-between items-start mb-4">
          <h3 className="text-md">
            Add Bonus Terms for{" "}
            <span className=" font-semibold">{bonus?.name}</span> (
            {bonus?.bookmaker})
          </h3>
          <button
            className="text-gray-400 hover:text-gray-600"
            onClick={onClose}
          >
            ×
          </button>
        </div>
        <div>
          <div className="flex justify-between items-center mb-2">
            <label className="block text-sm font-medium text-gray-700 mb-5">
              Terms & Conditions
            </label>
          </div>
          <textarea
            value={newTermsFormData.terms}
            onChange={(e) => {
              setNewTermsFormData({
                ...newTermsFormData,
                terms: e.target.value,
              });
            }}
            className="w-full border rounded-md p-2 text-sm"
            rows="7"
            placeholder="Enter terms and conditions"
          />
        </div>
        <div className="flex justify-end gap-2 mt-6">
          <button
            onClick={onClose}
            className="px-3 py-1 rounded font-semibold text-sm text-white whitespace-nowrap flex items-center justify-center bg-blue-500 hover:bg-blue-600 transition"
          >
            Cancel
          </button>
          <button
            onClick={handleAddTerms}
            className={`px-3 py-1 rounded font-semibold text-sm text-white whitespace-nowrap flex items-center justify-center bg-blue-500 hover:bg-blue-600 transition ${
              newTermsFormData.terms === "" ? "bg-gray-300 text-gray-500 cursor-not-allowed" : "" 
            }`}
            disabled={newTermsFormData.terms === ""}
          >
            {isLoading ? <Spinner /> : "Add & Process Bonus"}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
