import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import DetailsModal from "../../modals/details-modal";
import Loader from "../../atoms/loader";
import { dataFetch } from "../../../helpers/data-fetch";
import useAuthStore from "../../../store/auth-store";

const API_ENDPOINT = import.meta.env.VITE_ENDPOINT;

const BonusDetailsPage = () => {
  const { id } = useParams();
  const [bonus, setBonus] = useState(null);
  const isLogged = useAuthStore((state) => state.isLogged);

  const fetchBonus = async () => {
    try {
      const response = await dataFetch(
        null,
        "GET",
        `${API_ENDPOINT}/bonuses/${id}`
      );
      const data = await response.json();
      setBonus(data);
    } catch (error) {
      console.error("Failed to fetch bonus", error);
    }
  };

  useEffect(() => {
    fetchBonus();
  }, [id, isLogged]);

  if (!bonus) {
    return (
      <div className="w-full h-full flex justify-center items-center font-bold pt-6">
        <Loader />
      </div>
    );
  }

  return (
    <div className="w-full h-full flex justify-center items-center">
      {bonus?.detail?.trim().toLowerCase().includes("not found") ? (
        <h2 className="font-bold">Bonus with id {id} is not found</h2>
      ) : (
        <DetailsModal
          fetchBonus={fetchBonus}
          bonus={bonus}
          selectedBonus={bonus}
          closeDetailsModal={() => window.close()}
          onSuccess={() => {}}
        />
      )}
    </div>
  );
};

export default BonusDetailsPage;
