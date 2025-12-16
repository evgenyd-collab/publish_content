import PropTypes from "prop-types";
import useAuthStore from "../../../store/auth-store";

const AddBonusButton = ({ openAddBonusModal, disabled }) => {
  const setAccessToken = useAuthStore((state) => state.setAccessToken);
  const setRefreshToken = useAuthStore((state) => state.setRefreshToken);

  return (
    <>
      <button
        onClick={openAddBonusModal}
        disabled={disabled}
        className={`px-3 py-1 rounded font-semibold text-sm text-white whitespace-nowrap flex items-center justify-center bg-blue-500 hover:bg-blue-600 transition ${
          disabled ? "bg-gray-300 text-gray-500 cursor-not-allowed" : ""
        }`}
      >
        Add New Bonus Manually
      </button>
      {/* <button onClick={() => setAccessToken("")}>CLEAR ACCESS TOKEN</button>
      <button onClick={() => setRefreshToken("")}>CLEAR REFRESH TOKEN</button> */}
    </>
  );
};

AddBonusButton.propTypes = {
  openAddBonusModal: PropTypes.func.isRequired,
  disabled: PropTypes.bool,
};

export default AddBonusButton;
